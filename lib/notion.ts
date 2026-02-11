import "server-only";

import { cache } from "react";
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
  source: "database" | "map";
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
const rawCacheTtlSeconds = Number(process.env.NOTION_CACHE_TTL_SECONDS ?? "60");
const notionCacheTtlSeconds =
  Number.isFinite(rawCacheTtlSeconds) && rawCacheTtlSeconds >= 0
    ? rawCacheTtlSeconds
    : 60;
const notionCacheTtlMs = notionCacheTtlSeconds * 1000;
const childBlockFetchConcurrency = 6;
let routesCache: TimedCacheEntry<RouteEntry[]> | undefined;
const pageCache = new Map<string, TimedCacheEntry<NotionPageData | null>>();

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

function createTimedCacheEntry<T>(value: T): TimedCacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + notionCacheTtlMs,
  };
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
    const response = await client.databases.query({
      database_id: normalizePageId(databaseId),
      start_cursor: cursor,
      page_size: 100,
    });

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
        source: "database",
      });
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return dedupeRoutes(routes);
}

export const getRoutes = cache(async (): Promise<RouteEntry[]> => {
  const cachedRoutes = readTimedCache(routesCache);
  if (cachedRoutes) {
    return cachedRoutes;
  }

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

  if (notionCacheTtlMs > 0) {
    routesCache = createTimedCacheEntry(routes);
  }

  return routes;
});

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
    const response = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

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

export const getPageBySlug = cache(
  async (slugInput: string): Promise<NotionPageData | null> => {
    const slug = normalizeSlug(slugInput);
    const cachedPage = readTimedCache(pageCache.get(slug));
    if (cachedPage !== undefined) {
      return cachedPage;
    }

    const routes = await getRoutes();
    const route = routes.find((entry) => entry.slug === slug);

    if (!route) {
      if (notionCacheTtlMs > 0) {
        pageCache.set(slug, createTimedCacheEntry(null));
      }
      return null;
    }

    const client = getNotionClient();
    const pageResponse = await client.pages.retrieve({ page_id: route.pageId });

    if (!isFullPage(pageResponse) || pageResponse.object !== "page") {
      return null;
    }

    const blocks = await loadBlocks(route.pageId);

    const page: NotionPageData = {
      id: pageResponse.id,
      slug: route.slug,
      title: route.title ?? extractTitle(pageResponse),
      description: route.description ?? extractDescription(pageResponse),
      lastEditedTime: pageResponse.last_edited_time,
      blocks,
    };

    if (notionCacheTtlMs > 0) {
      pageCache.set(slug, createTimedCacheEntry(page));
    }

    return page;
  }
);

export const getAllSlugs = cache(async (): Promise<string[]> => {
  const routes = await getRoutes();
  return routes.map((route) => route.slug);
});
