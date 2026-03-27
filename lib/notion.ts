import "server-only";

import { unstable_cache } from "next/cache";
import { Client, isFullBlock, isFullPage } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import routeMap from "@/content/route-map.json";

export type RouteEntry = {
  slug: string;
  pageId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  source: "database" | "map";
};

export type ChildPageCardSeed = {
  pageId: string;
  slug: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  source?: RouteEntry["source"];
};

export type ChildPageCard = {
  pageId: string;
  slug: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  thumbnailFallbackUrl?: string;
};

export type NotionBlock = BlockObjectResponse & {
  children?: NotionBlock[];
};

export type NotionPageData = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  lastEditedTime?: string;
  blocks: NotionBlock[];
};

type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const notion = process.env.NOTION_TOKEN
  ? new Client({ auth: process.env.NOTION_TOKEN })
  : null;

const slugPropertyName = process.env.NOTION_SLUG_PROPERTY ?? "Slug";
const publishedPropertyName = process.env.NOTION_PUBLISHED_PROPERTY ?? "Published";
const descriptionPropertyName =
  process.env.NOTION_DESCRIPTION_PROPERTY ?? "Description";
const thumbnailPropertyName =
  process.env.NOTION_THUMBNAIL_PROPERTY ?? "Thumbnail";
const rawCacheTtlSeconds = Number(process.env.NOTION_CACHE_TTL_SECONDS ?? "900");
const notionCacheTtlSeconds =
  Number.isFinite(rawCacheTtlSeconds) && rawCacheTtlSeconds >= 0
    ? rawCacheTtlSeconds
    : 900;
const rawNotionMaxRetries = Number(process.env.NOTION_MAX_RETRIES ?? "4");
const notionMaxRetries =
  Number.isFinite(rawNotionMaxRetries) && rawNotionMaxRetries >= 1
    ? Math.floor(rawNotionMaxRetries)
    : 4;
const rawNotionRetryBaseDelayMs = Number(
  process.env.NOTION_RETRY_BASE_DELAY_MS ?? "750"
);
const notionRetryBaseDelayMs =
  Number.isFinite(rawNotionRetryBaseDelayMs) && rawNotionRetryBaseDelayMs >= 0
    ? rawNotionRetryBaseDelayMs
    : 750;
const notionCacheTtlMs = notionCacheTtlSeconds * 1000;
const rawChildBlockFetchConcurrency = Number(
  process.env.NOTION_CHILD_BLOCK_FETCH_CONCURRENCY ?? "4"
);
const childBlockFetchConcurrency =
  Number.isFinite(rawChildBlockFetchConcurrency) && rawChildBlockFetchConcurrency >= 1
    ? Math.floor(rawChildBlockFetchConcurrency)
    : 4;
export const NOTION_ROUTES_TAG = "notion-routes";
export const NOTION_PAGES_TAG = "notion-pages";
let routesCache: TimedCacheEntry<RouteEntry[]> | undefined;
const pageCache = new Map<string, TimedCacheEntry<NotionPageData | null>>();
let routesRefreshPromise: Promise<RouteEntry[]> | undefined;
const pageRefreshPromises = new Map<string, Promise<NotionPageData | null>>();
const childPageCardCache = new Map<string, TimedCacheEntry<ChildPageCard>>();
const childPageCardRefreshPromises = new Map<string, Promise<ChildPageCard>>();

function getNotionClient(): Client {
  if (!notion) {
    throw new Error(
      "NOTION_TOKEN is missing. Add it to .env.local before running the site."
    );
  }
  return notion;
}

function normalizePageId(raw: string): string {
  const trimmed = raw.trim();
  const compact = trimmed.replace(/-/g, "");

  if (compact.length === 32) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
  }

  return trimmed;
}

function readTimedCache<T>(entry: TimedCacheEntry<T> | undefined): T | undefined {
  if (!entry) {
    return undefined;
  }

  if (Date.now() >= entry.expiresAt) {
    return undefined;
  }

  return entry.value;
}

function readStaleTimedCache<T>(entry: TimedCacheEntry<T> | undefined): T | undefined {
  return entry?.value;
}

function createTimedCacheEntry<T>(value: T): TimedCacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + notionCacheTtlMs,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getHeaderValue(
  headers: Headers | Record<string, string> | undefined,
  name: string
): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }

  const record = headers as Record<string, string>;
  const matchedKey = Object.keys(record).find(
    (key) => key.toLowerCase() === name.toLowerCase()
  );

  return matchedKey ? record[matchedKey] : undefined;
}

function getRetryAfterDelayMs(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const retryAfter = getHeaderValue(
    (error as { headers?: Headers | Record<string, string> }).headers,
    "retry-after"
  );
  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const parsedDate = Date.parse(retryAfter);
  if (Number.isNaN(parsedDate)) {
    return undefined;
  }

  return Math.max(parsedDate - Date.now(), 0);
}

function isRetriableNotionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status =
    typeof (error as { status?: unknown }).status === "number"
      ? ((error as { status: number }).status)
      : undefined;
  const code =
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;

  if (code === "rate_limited") {
    return true;
  }

  if (status === 408 || status === 409 || status === 425 || status === 429) {
    return true;
  }

  return typeof status === "number" && status >= 500;
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  const retryAfterDelay = getRetryAfterDelayMs(error);
  if (retryAfterDelay !== undefined) {
    return retryAfterDelay;
  }

  const exponentialDelay = notionRetryBaseDelayMs * 2 ** Math.max(attempt - 1, 0);
  return Math.min(exponentialDelay, 10_000);
}

async function withNotionRetry<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetriableNotionError(error) || attempt >= notionMaxRetries) {
        throw error;
      }

      const status =
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined;
      const code =
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : undefined;
      const delayMs = getRetryDelayMs(error, attempt);

      console.warn(
        `Transient Notion error during ${label}; retrying in ${delayMs}ms (attempt ${attempt}/${notionMaxRetries - 1} retries).`,
        { status, code }
      );

      await wait(delayMs);
      attempt += 1;
    }
  }
}

function normalizeSlug(raw: string): string {
  const withoutDomain = raw.trim().replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutDomain.split(/[?#]/)[0] ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;

  const cleaned = withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");
  return cleaned || "/";
}

export function notionPageTag(slugInput: string): string {
  return `notion-page:${normalizeSlug(slugInput)}`;
}

function isHiddenRouteSlug(slug: string): boolean {
  return /-type-tester$/i.test(slug);
}

export function slugFromSegments(segments?: string[]): string {
  if (!segments || segments.length === 0) {
    return "/";
  }

  return normalizeSlug(segments.join("/"));
}

export function getSiteUrl(): string {
  const fallback = "https://aex.design";
  const raw = process.env.SITE_URL?.trim();

  if (!raw) {
    return fallback;
  }

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function invalidateNotionCache(slugInput?: string): void {
  routesCache = undefined;
  childPageCardCache.clear();

  if (typeof slugInput === "string" && slugInput.trim().length > 0) {
    const slug = normalizeSlug(slugInput);
    pageCache.delete(slug);
    return;
  }

  pageCache.clear();
}

function plainText(richText: RichTextItemResponse[] | undefined): string {
  if (!richText || richText.length === 0) {
    return "";
  }

  return richText.map((item) => item.plain_text).join("");
}

function findProperty(
  properties: Record<string, any>,
  preferredName: string,
  fallbacks: string[]
): any {
  const names = [preferredName, ...fallbacks].filter(Boolean);

  for (const name of names) {
    if (name in properties) {
      return properties[name];
    }

    const foundKey = Object.keys(properties).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );

    if (foundKey) {
      return properties[foundKey];
    }
  }

  return undefined;
}

function getPropertyText(property: any): string | undefined {
  if (!property) {
    return undefined;
  }

  switch (property.type) {
    case "title":
      return plainText(property.title).trim() || undefined;
    case "rich_text":
      return plainText(property.rich_text).trim() || undefined;
    case "url":
      return property.url ?? undefined;
    case "email":
      return property.email ?? undefined;
    case "phone_number":
      return property.phone_number ?? undefined;
    case "select":
      return property.select?.name ?? undefined;
    case "status":
      return property.status?.name ?? undefined;
    case "number":
      return typeof property.number === "number"
        ? String(property.number)
        : undefined;
    default:
      return undefined;
  }
}

function getPropertyFileUrl(property: any): string | undefined {
  if (!property) {
    return undefined;
  }

  if (property.type === "files") {
    const [firstFile] = Array.isArray(property.files) ? property.files : [];
    if (!firstFile) {
      return undefined;
    }

    if (firstFile.type === "external") {
      return firstFile.external?.url ?? undefined;
    }

    if (firstFile.type === "file") {
      return firstFile.file?.url ?? undefined;
    }

    return undefined;
  }

  if (property.type === "url") {
    return property.url ?? undefined;
  }

  return undefined;
}

function getFirstFilesPropertyUrl(
  properties: Record<string, any>
): string | undefined {
  for (const value of Object.values(properties)) {
    if (value?.type !== "files") {
      continue;
    }

    const propertyUrl = getPropertyFileUrl(value);
    if (propertyUrl) {
      return propertyUrl;
    }
  }

  return undefined;
}

function buildNotionImageProxyUrl(
  blockId: string,
  sourceUrl?: string | null
): string {
  const proxyPath = `/api/notion-image/${encodeURIComponent(blockId)}`;
  if (!sourceUrl) {
    return proxyPath;
  }

  const searchParams = new URLSearchParams({ source: sourceUrl });
  return `${proxyPath}?${searchParams.toString()}`;
}

function resolveCardImagePrimarySrc(block: NotionBlock): string | undefined {
  if (block.type !== "image") {
    return undefined;
  }

  if (block.image.type === "external") {
    return block.image.external.url;
  }

  return buildNotionImageProxyUrl(block.id, block.image.file.url);
}

function resolveCardImageFallbackSrc(block: NotionBlock): string | undefined {
  if (block.type !== "image" || block.image.type === "external") {
    return undefined;
  }

  return buildNotionImageProxyUrl(block.id);
}

function getPropertyCheckbox(property: any, fallback = true): boolean {
  if (!property) {
    return fallback;
  }

  if (property.type === "checkbox") {
    return Boolean(property.checkbox);
  }

  const asText = getPropertyText(property);
  if (!asText) {
    return fallback;
  }

  return ["1", "true", "yes", "y", "published", "live"].includes(
    asText.toLowerCase()
  );
}

function extractTitle(page: PageObjectResponse): string {
  const properties = page.properties as Record<string, any>;

  for (const value of Object.values(properties)) {
    if (value?.type === "title") {
      const title = plainText(value.title).trim();
      if (title) {
        return title;
      }
    }
  }

  return "Untitled";
}

function extractDescription(page: PageObjectResponse): string | undefined {
  const properties = page.properties as Record<string, any>;
  const descriptionProperty = findProperty(
    properties,
    descriptionPropertyName,
    ["description", "Description", "Summary", "Excerpt"]
  );

  return getPropertyText(descriptionProperty);
}

function extractThumbnailUrl(page: PageObjectResponse): string | undefined {
  const properties = page.properties as Record<string, any>;
  const thumbnailProperty = findProperty(
    properties,
    thumbnailPropertyName,
    ["thumbnail", "Thumbnail", "Card Thumbnail", "Preview", "Image"]
  );
  const propertyUrl = getPropertyFileUrl(thumbnailProperty);

  if (propertyUrl) {
    return propertyUrl;
  }

  const firstFilesPropertyUrl = getFirstFilesPropertyUrl(properties);
  if (firstFilesPropertyUrl) {
    return firstFilesPropertyUrl;
  }

  if (page.cover?.type === "external") {
    return page.cover.external.url;
  }

  if (page.cover?.type === "file") {
    return page.cover.file.url;
  }

  return undefined;
}

function buildChildPageCard(seed: ChildPageCardSeed): ChildPageCard {
  const normalizedTitle = seed.title?.trim();
  const normalizedDescription = seed.description?.trim();
  const normalizedThumbnailUrl = seed.thumbnailUrl?.trim();

  return {
    pageId: normalizePageId(seed.pageId),
    slug: normalizeSlug(seed.slug),
    title: normalizedTitle && normalizedTitle.length > 0 ? normalizedTitle : "Untitled",
    description:
      normalizedDescription && normalizedDescription.length > 0
        ? normalizedDescription
        : undefined,
    thumbnailUrl:
      normalizedThumbnailUrl && normalizedThumbnailUrl.length > 0
        ? normalizedThumbnailUrl
        : undefined,
  };
}

function mergeChildPageCard(
  card: ChildPageCard,
  seed: ChildPageCardSeed
): ChildPageCard {
  const normalizedSeedTitle = seed.title?.trim();
  const normalizedSeedDescription = seed.description?.trim();
  const normalizedSeedThumbnailUrl = seed.thumbnailUrl?.trim();

  return {
    pageId: normalizePageId(seed.pageId),
    slug: normalizeSlug(seed.slug),
    title:
      card.title ||
      (normalizedSeedTitle && normalizedSeedTitle.length > 0
        ? normalizedSeedTitle
        : "Untitled"),
    description:
      card.description ??
      (normalizedSeedDescription && normalizedSeedDescription.length > 0
        ? normalizedSeedDescription
        : undefined),
    thumbnailUrl:
      card.thumbnailUrl ??
      (normalizedSeedThumbnailUrl && normalizedSeedThumbnailUrl.length > 0
        ? normalizedSeedThumbnailUrl
        : undefined),
    thumbnailFallbackUrl: card.thumbnailFallbackUrl,
  };
}

function extractCardDescriptionFromBlocks(
  blocks: NotionBlock[]
): string | undefined {
  for (const block of blocks) {
    if (block.type !== "paragraph") {
      continue;
    }

    const text = plainText(block.paragraph.rich_text).trim();
    if (text.length > 0) {
      return text;
    }
  }

  return undefined;
}

function extractCardThumbnailFromBlocks(blocks: NotionBlock[]): {
  thumbnailUrl?: string;
  thumbnailFallbackUrl?: string;
} {
  for (const block of blocks) {
    if (block.type !== "image") {
      continue;
    }

    return {
      thumbnailUrl: resolveCardImagePrimarySrc(block),
      thumbnailFallbackUrl: resolveCardImageFallbackSrc(block),
    };
  }

  return {};
}

function dedupeRoutes(routes: RouteEntry[]): RouteEntry[] {
  const bySlug = new Map<string, RouteEntry>();

  for (const route of routes) {
    if (!bySlug.has(route.slug)) {
      bySlug.set(route.slug, route);
    }
  }

  return Array.from(bySlug.values())
    .filter((route) => !isHiddenRouteSlug(route.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadStaticRoutes(): RouteEntry[] {
  const staticEntries = Array.isArray(routeMap) ? routeMap : [];

  const entries: RouteEntry[] = staticEntries
    .map((entry: any) => {
      const slug = typeof entry.slug === "string" ? normalizeSlug(entry.slug) : "";
      const pageId = typeof entry.pageId === "string" ? entry.pageId.trim() : "";

      if (!slug || !pageId) {
        return null;
      }

      return {
        slug,
        pageId: normalizePageId(pageId),
        title: typeof entry.title === "string" ? entry.title : undefined,
        description:
          typeof entry.description === "string" ? entry.description : undefined,
        thumbnailUrl:
          typeof entry.thumbnailUrl === "string"
            ? entry.thumbnailUrl
            : typeof entry.thumbnail === "string"
              ? entry.thumbnail
              : undefined,
        source: "map" as const,
      };
    })
    .filter(Boolean) as RouteEntry[];

  const homePageId = process.env.NOTION_HOME_PAGE_ID?.trim();
  if (homePageId && !entries.some((route) => route.slug === "/")) {
    entries.unshift({
      slug: "/",
      pageId: normalizePageId(homePageId),
      source: "map",
    });
  }

  return dedupeRoutes(entries);
}

async function loadDatabaseRoutes(): Promise<RouteEntry[]> {
  const databaseId = process.env.NOTION_DATABASE_ID?.trim();
  if (!databaseId) {
    return [];
  }

  const client = getNotionClient();
  const routes: RouteEntry[] = [];
  let cursor: string | undefined;

  do {
    const response = await withNotionRetry("database route query", () =>
      client.databases.query({
        database_id: normalizePageId(databaseId),
        start_cursor: cursor,
        page_size: 100,
      })
    );

    for (const result of response.results) {
      if (!isFullPage(result) || result.object !== "page") {
        continue;
      }

      const properties = result.properties as Record<string, any>;
      const slugProperty = findProperty(properties, slugPropertyName, ["slug", "Slug"]);
      const publishedProperty = findProperty(properties, publishedPropertyName, [
        "published",
        "Published",
        "live",
        "Live",
      ]);

      const slugValue = getPropertyText(slugProperty);
      if (!slugValue) {
        continue;
      }

      const slug = normalizeSlug(slugValue);
      if (isHiddenRouteSlug(slug)) {
        continue;
      }

      if (!getPropertyCheckbox(publishedProperty, true)) {
        continue;
      }

      const descriptionProperty = findProperty(
        properties,
        descriptionPropertyName,
        ["description", "Description", "Summary", "Excerpt"]
      );

      routes.push({
        slug,
        pageId: normalizePageId(result.id),
        title: extractTitle(result),
        description: getPropertyText(descriptionProperty),
        thumbnailUrl: extractThumbnailUrl(result),
        source: "database",
      });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return dedupeRoutes(routes);
}

async function getRoutesWithProcessCache(): Promise<RouteEntry[]> {
  const cachedRoutes = readTimedCache(routesCache);
  if (cachedRoutes !== undefined) {
    return cachedRoutes;
  }

  const staleRoutes = readStaleTimedCache(routesCache);
  if (staleRoutes !== undefined) {
    if (!routesRefreshPromise) {
      routesRefreshPromise = refreshRoutes().finally(() => {
        routesRefreshPromise = undefined;
      });
    }

    return staleRoutes;
  }

  if (!routesRefreshPromise) {
    routesRefreshPromise = refreshRoutes().finally(() => {
      routesRefreshPromise = undefined;
    });
  }

  return routesRefreshPromise;
}

const getPersistentRoutes = unstable_cache(
  async (): Promise<RouteEntry[]> => getRoutesWithProcessCache(),
  [NOTION_ROUTES_TAG],
  {
    revalidate: notionCacheTtlSeconds,
    tags: [NOTION_ROUTES_TAG],
  }
);

export async function getRoutes(): Promise<RouteEntry[]> {
  return getPersistentRoutes();
}

async function refreshChildPageCard(seed: ChildPageCardSeed): Promise<ChildPageCard> {
  const pageId = normalizePageId(seed.pageId);
  const staleCard = readStaleTimedCache(childPageCardCache.get(pageId));
  const fallbackCard = staleCard ?? buildChildPageCard(seed);

  try {
    const page = await getPageBySlug(seed.slug);

    if (!page) {
      childPageCardCache.set(pageId, createTimedCacheEntry(fallbackCard));
      return fallbackCard;
    }

    const { thumbnailUrl, thumbnailFallbackUrl } =
      extractCardThumbnailFromBlocks(page.blocks);
    const card: ChildPageCard = {
      pageId,
      slug: normalizeSlug(page.slug),
      title: page.title.trim() || fallbackCard.title,
      description:
        extractCardDescriptionFromBlocks(page.blocks) ??
        page.description ??
        fallbackCard.description,
      thumbnailUrl: thumbnailUrl ?? fallbackCard.thumbnailUrl,
      thumbnailFallbackUrl:
        thumbnailFallbackUrl ?? fallbackCard.thumbnailFallbackUrl,
    };

    childPageCardCache.set(pageId, createTimedCacheEntry(card));
    return card;
  } catch (error) {
    console.error("Failed to load child page card metadata:", seed.slug, error);
    childPageCardCache.set(pageId, createTimedCacheEntry(fallbackCard));
    return fallbackCard;
  }
}

async function getChildPageCard(seed: ChildPageCardSeed): Promise<ChildPageCard> {
  const pageId = normalizePageId(seed.pageId);
  const cachedCard = readTimedCache(childPageCardCache.get(pageId));
  if (cachedCard !== undefined) {
    return mergeChildPageCard(cachedCard, seed);
  }

  const staleCard = readStaleTimedCache(childPageCardCache.get(pageId));
  if (staleCard !== undefined) {
    if (!childPageCardRefreshPromises.has(pageId)) {
      childPageCardRefreshPromises.set(
        pageId,
        refreshChildPageCard(seed).finally(() => {
          childPageCardRefreshPromises.delete(pageId);
        })
      );
    }

    return mergeChildPageCard(staleCard, seed);
  }

  if (!childPageCardRefreshPromises.has(pageId)) {
    childPageCardRefreshPromises.set(
      pageId,
      refreshChildPageCard(seed).finally(() => {
        childPageCardRefreshPromises.delete(pageId);
      })
    );
  }

  const card = await (childPageCardRefreshPromises.get(pageId) as Promise<ChildPageCard>);
  return mergeChildPageCard(card, seed);
}

export async function getChildPageCards(
  seeds: ChildPageCardSeed[]
): Promise<ChildPageCard[]> {
  const dedupedSeeds = Array.from(
    new Map(
      seeds
        .filter(
          (seed) =>
            seed &&
            typeof seed.pageId === "string" &&
            seed.pageId.trim().length > 0 &&
            typeof seed.slug === "string" &&
            seed.slug.trim().length > 0
        )
        .map((seed) => [normalizePageId(seed.pageId), seed])
    ).values()
  );

  if (dedupedSeeds.length === 0) {
    return [];
  }

  const results = new Array<ChildPageCard>(dedupedSeeds.length);
  let cursor = 0;
  const workerCount = Math.min(childBlockFetchConcurrency, dedupedSeeds.length);

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= dedupedSeeds.length) {
        return;
      }

      results[index] = await getChildPageCard(dedupedSeeds[index]);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function refreshRoutes(): Promise<RouteEntry[]> {
  try {
    let routes: RouteEntry[];

    if (process.env.NOTION_DATABASE_ID) {
      try {
        const databaseRoutes = await loadDatabaseRoutes();
        if (databaseRoutes.length > 0) {
          routes = databaseRoutes;
        } else {
          routes = loadStaticRoutes();
        }
      } catch (error) {
        console.error("Failed to load routes from Notion database:", error);
        routes = loadStaticRoutes();
      }
    } else {
      routes = loadStaticRoutes();
    }

    routesCache = createTimedCacheEntry(routes);
    return routes;
  } catch (error) {
    console.error("Failed to refresh routes:", error);

    const staleRoutes = readStaleTimedCache(routesCache);
    if (staleRoutes !== undefined) {
      return staleRoutes;
    }

    const fallbackRoutes = loadStaticRoutes();
    routesCache = createTimedCacheEntry(fallbackRoutes);
    return fallbackRoutes;
  }
}

async function hydrateChildBlocks(blocks: NotionBlock[]): Promise<void> {
  const withChildren = blocks.filter((block) => block.has_children);
  if (withChildren.length === 0) {
    return;
  }

  let cursor = 0;
  const workerCount = Math.min(childBlockFetchConcurrency, withChildren.length);

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= withChildren.length) {
        return;
      }

      const block = withChildren[index];
      block.children = await loadBlocks(block.id);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function loadBlocks(blockId: string): Promise<NotionBlock[]> {
  const client = getNotionClient();
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await withNotionRetry(`block children fetch (${blockId})`, () =>
      client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      })
    );

    const currentPageBlocks: NotionBlock[] = [];

    for (const result of response.results) {
      if (!isFullBlock(result) || result.object !== "block") {
        continue;
      }

      const block: NotionBlock = { ...result };
      currentPageBlocks.push(block);
    }

    await hydrateChildBlocks(currentPageBlocks);
    blocks.push(...currentPageBlocks);

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function refreshPage(slug: string): Promise<NotionPageData | null> {
  const stalePage = readStaleTimedCache(pageCache.get(slug));

  let routes: RouteEntry[];
  try {
    routes = await getRoutes();
  } catch (error) {
    console.error("Failed to load routes while resolving slug:", slug, error);
    if (stalePage !== undefined) {
      return stalePage;
    }

    throw error;
  }

  const route = routes.find((entry) => entry.slug === slug);

  if (!route) {
    pageCache.set(slug, createTimedCacheEntry(null));
    return null;
  }

  try {
    const client = getNotionClient();

    if (stalePage && stalePage.id === route.pageId) {
      const pageResponse = await withNotionRetry(`page fetch (${slug})`, () =>
        client.pages.retrieve({ page_id: route.pageId })
      );

      if (!isFullPage(pageResponse) || pageResponse.object !== "page") {
        pageCache.set(slug, createTimedCacheEntry(null));
        return null;
      }

      const blocksUnchanged = stalePage.lastEditedTime === pageResponse.last_edited_time;
      const blocks = blocksUnchanged ? stalePage.blocks : await loadBlocks(route.pageId);

      const page: NotionPageData = {
        id: pageResponse.id,
        slug: route.slug,
        title: route.title ?? extractTitle(pageResponse),
        description: route.description ?? extractDescription(pageResponse),
        lastEditedTime: pageResponse.last_edited_time,
        blocks,
      };

      pageCache.set(slug, createTimedCacheEntry(page));
      return page;
    }

    const [pageResponse, blocks] = await Promise.all([
      withNotionRetry(`page fetch (${slug})`, () =>
        client.pages.retrieve({ page_id: route.pageId })
      ),
      loadBlocks(route.pageId),
    ]);

    if (!isFullPage(pageResponse) || pageResponse.object !== "page") {
      pageCache.set(slug, createTimedCacheEntry(null));
      return null;
    }

    const page: NotionPageData = {
      id: pageResponse.id,
      slug: route.slug,
      title: route.title ?? extractTitle(pageResponse),
      description: route.description ?? extractDescription(pageResponse),
      lastEditedTime: pageResponse.last_edited_time,
      blocks,
    };

    pageCache.set(slug, createTimedCacheEntry(page));
    return page;
  } catch (error) {
    console.error("Failed to load Notion page by slug:", slug, error);
    if (stalePage !== undefined) {
      return stalePage;
    }

    throw error;
  }
}

async function getPageBySlugWithProcessCache(
  slug: string
): Promise<NotionPageData | null> {
  const pageCacheEntry = pageCache.get(slug);
  const cachedPage = readTimedCache(pageCacheEntry);
  if (cachedPage !== undefined) {
    return cachedPage;
  }

  const stalePage = readStaleTimedCache(pageCacheEntry);
  if (stalePage !== undefined) {
    if (!pageRefreshPromises.has(slug)) {
      pageRefreshPromises.set(
        slug,
        refreshPage(slug).finally(() => {
          pageRefreshPromises.delete(slug);
        })
      );
    }
    return stalePage;
  }

  if (!pageRefreshPromises.has(slug)) {
    pageRefreshPromises.set(
      slug,
      refreshPage(slug).finally(() => {
        pageRefreshPromises.delete(slug);
      })
    );
  }

  return pageRefreshPromises.get(slug) as Promise<NotionPageData | null>;
}

export async function getPageBySlug(slugInput: string): Promise<NotionPageData | null> {
  const slug = normalizeSlug(slugInput);

  return unstable_cache(
    async () => getPageBySlugWithProcessCache(slug),
    ["notion-page", slug],
    {
      revalidate: notionCacheTtlSeconds,
      tags: [NOTION_PAGES_TAG, notionPageTag(slug)],
    }
  )();
}

export async function getAllSlugs(): Promise<string[]> {
  const routes = await getRoutes();
  return routes.map((route) => route.slug);
}
