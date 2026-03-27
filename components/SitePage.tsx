import { preconnect, prefetchDNS, preload } from "react-dom";
import { EveryDays2026Viewer } from "@/components/EveryDays2026Viewer";
import { NotionRenderer } from "@/components/NotionRenderer";
import everyDaysCollection2026 from "@/public/data/collection-2026.json";
import { resolveNotionImagePrimarySrc } from "@/lib/notion-images";
import {
  getChildPageCards,
  getPageBySlug,
  getRoutes,
  type ChildPageCardSeed,
  type NotionBlock,
  type NotionPageData,
  type RouteEntry,
} from "@/lib/notion";

function toPageClass(slug: string): string {
  if (slug === "/") {
    return "index";
  }

  return slug.replace(/^\//, "").replace(/\//g, "-");
}

type TopActionConfig = {
  metaClassName: "cc0" | "mint-link" | "license-one";
  metaHref: string;
  metaLabel: string;
  releaseYear: number;
  buttonClassName: "get-button" | "buy-button";
  buttonHref: string;
  buttonLabel: string;
};

type EveryDaysCollectionRecord = {
  artworks?: Array<{
    id?: unknown;
  }>;
};

const everyDaysCanvasMarkers = new Set([
  "insert canvas here",
  "[[every-days-2026-canvas]]",
  "every-days-2026-canvas",
]);
const childPageCardParentSlugs = new Set(["/da", "/dda", "/archive"]);
const priorityImageLoadLimit = 6;
const priorityImagePreloadLimit = 3;

function getLatestEveryDaysArtworkId(): number | null {
  const collection =
    everyDaysCollection2026 as EveryDaysCollectionRecord;
  const artworks: Array<{ id?: unknown }> = Array.isArray(collection.artworks)
    ? collection.artworks
    : [];

  const latestId = artworks.reduce((currentLatest, artwork) => {
    const id =
      typeof artwork?.id === "number" ? artwork.id : Number(artwork?.id);

    if (!Number.isInteger(id) || id <= currentLatest) {
      return currentLatest;
    }

    return id;
  }, 0);

  return latestId > 0 ? latestId : null;
}
function joinRichTextPlainText(
  items: Array<{ plain_text?: string }> | undefined
): string {
  if (!items || items.length === 0) {
    return "";
  }

  return items.map((item) => item.plain_text ?? "").join("");
}

function normalizeCanvasMarker(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizePageId(value: string): string {
  return value.replace(/-/g, "").trim().toLowerCase();
}

function normalizeSlug(value: string): string {
  const withoutDomain = value.trim().replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutDomain.split(/[?#]/)[0] ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const cleaned = withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");

  return cleaned || "/";
}

function slugFromTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizeSlug(normalized ? `/${normalized}` : "/");
}

function shouldRenderChildPageCards(pageSlug: string): boolean {
  return childPageCardParentSlugs.has(normalizeSlug(pageSlug));
}

function findEveryDaysCanvasMarkerIndex(blocks: NotionBlock[]): number {
  return blocks.findIndex((block) => {
    if (block.type !== "paragraph") {
      return false;
    }

    const text = normalizeCanvasMarker(
      joinRichTextPlainText(block.paragraph.rich_text)
    );

    return everyDaysCanvasMarkers.has(text);
  });
}

function hasChildPageBlocks(blocks: NotionBlock[]): boolean {
  for (const block of blocks) {
    if (block.type === "child_page") {
      return true;
    }

    if (block.children?.length && hasChildPageBlocks(block.children)) {
      return true;
    }
  }

  return false;
}

function collectChildPageCardSeeds(
  blocks: NotionBlock[],
  routeEntries: RouteEntry[]
): ChildPageCardSeed[] {
  const routeByPageId = new Map(
    routeEntries.map((route) => [normalizePageId(route.pageId), route])
  );
  const seeds: ChildPageCardSeed[] = [];

  function walk(currentBlocks: NotionBlock[]): void {
    for (const block of currentBlocks) {
      if (block.type === "child_page") {
        const route = routeByPageId.get(normalizePageId(block.id));
        const slug = route?.slug ?? slugFromTitle(block.child_page.title);

        if (!/-type-tester$/i.test(slug)) {
          seeds.push({
            pageId: block.id,
            slug,
            title: route?.title ?? block.child_page.title,
            description: route?.description,
            thumbnailUrl: route?.thumbnailUrl,
            source: route?.source,
          });
        }
      }

      if (block.children?.length) {
        walk(block.children);
      }
    }
  }

  walk(blocks);
  return seeds;
}

function collectChildPageIds(blocks: NotionBlock[]): Set<string> {
  const ids = new Set<string>();

  function walk(currentBlocks: NotionBlock[]): void {
    for (const block of currentBlocks) {
      if (block.type === "child_page") {
        ids.add(normalizePageId(block.id));
      }

      if (block.children?.length) {
        walk(block.children);
      }
    }
  }

  walk(blocks);
  return ids;
}

function collectCardPreviewHiddenBlockIds(blocks: NotionBlock[]): Set<string> {
  const hiddenBlockIds = new Set<string>();
  let firstParagraphHidden = false;
  let firstImageHidden = false;

  for (const block of blocks) {
    if (!firstParagraphHidden && block.type === "paragraph") {
      const text = joinRichTextPlainText(block.paragraph.rich_text).trim();
      if (text.length > 0) {
        hiddenBlockIds.add(block.id);
        firstParagraphHidden = true;
        continue;
      }
    }

    if (!firstImageHidden && block.type === "image") {
      hiddenBlockIds.add(block.id);
      firstImageHidden = true;
    }

    if (firstParagraphHidden && firstImageHidden) {
      break;
    }
  }

  return hiddenBlockIds;
}

async function isChildPageCardSourcePage(pageId: string): Promise<boolean> {
  const parentPages = await Promise.all(
    Array.from(childPageCardParentSlugs, (slug) =>
      getPageBySlug(slug).catch(() => null)
    )
  );
  const normalizedPageId = normalizePageId(pageId);

  for (const parentPage of parentPages) {
    if (!parentPage) {
      continue;
    }

    if (collectChildPageIds(parentPage.blocks).has(normalizedPageId)) {
      return true;
    }
  }

  return false;
}

function collectPriorityImageIds(
  blocks: NotionBlock[],
  limit: number
): Set<string> {
  const ids = new Set<string>();

  function walk(currentBlocks: NotionBlock[]): void {
    for (const block of currentBlocks) {
      if (ids.size >= limit) {
        return;
      }

      if (block.type === "image") {
        ids.add(block.id);
      }

      if (block.children?.length) {
        walk(block.children);
      }
    }
  }

  if (limit > 0) {
    walk(blocks);
  }

  return ids;
}

function collectPriorityImageSources(
  blocks: NotionBlock[],
  limit: number
): string[] {
  const sources: string[] = [];

  function pushIfPresent(value: string | undefined): void {
    if (!value || sources.length >= limit) {
      return;
    }

    sources.push(value);
  }

  function walk(currentBlocks: NotionBlock[]): void {
    for (const block of currentBlocks) {
      if (sources.length >= limit) {
        return;
      }

      if (block.type === "image") {
        pushIfPresent(resolveNotionImagePrimarySrc(block) ?? undefined);
      }

      if (block.children?.length) {
        walk(block.children);
      }
    }
  }

  if (limit > 0) {
    walk(blocks);
  }

  return sources;
}

const topActionBySlug: Record<string, TopActionConfig> = {
  "/p5nels": {
    metaClassName: "cc0",
    metaHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    metaLabel: "License",
    releaseYear: 2024,
    buttonClassName: "get-button",
    buttonHref: "https://store.aex.design/l//p5nels",
    buttonLabel: "Get-Free",
  },
  "/typecheck": {
    metaClassName: "mint-link",
    metaHref: "https://creativecommons.org/public-domain/cc0/",
    metaLabel: "License",
    releaseYear: 2023,
    buttonClassName: "get-button",
    buttonHref: "https://store.aex.design/l/typecheck",
    buttonLabel: "Get-Free",
  },
  "/nounty": {
    metaClassName: "mint-link",
    metaHref: "https://creativecommons.org/public-domain/cc0/",
    metaLabel: "License",
    releaseYear: 2023,
    buttonClassName: "get-button",
    buttonHref: "https://store.aex.design/l/nounty",
    buttonLabel: "Get-Free",
  },
  "/aexpective": {
    metaClassName: "mint-link",
    metaHref: "https://creativecommons.org/public-domain/cc0/",
    metaLabel: "License",
    releaseYear: 2022,
    buttonClassName: "get-button",
    buttonHref: "https://store.aex.design/l/aexpective",
    buttonLabel: "Get-Free",
  },
  "/designassetpack2": {
    metaClassName: "license-one",
    metaHref: "https://aex.design/license-one",
    metaLabel: "License",
    releaseYear: 2023,
    buttonClassName: "buy-button",
    buttonHref: "https://store.aex.design/l/designassetpack2",
    buttonLabel: "Buy-$1",
  },
  "/aextract": {
    metaClassName: "license-one",
    metaHref: "https://aex.design/license-one",
    metaLabel: "License",
    releaseYear: 2022,
    buttonClassName: "buy-button",
    buttonHref: "https://store.aex.design/l/aextract",
    buttonLabel: "Buy-$1",
  },
  "/aextract36": {
    metaClassName: "cc0",
    metaHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    metaLabel: "License",
    releaseYear: 2021,
    buttonClassName: "get-button",
    buttonHref: "https://store.aex.design/l/aextract36",
    buttonLabel: "Get-Free",
  },
  "/designassetpack1": {
    metaClassName: "cc0",
    metaHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    metaLabel: "License",
    releaseYear: 2021,
    buttonClassName: "get-button",
    buttonHref: "https://store.aex.design/l//designassetpack1",
    buttonLabel: "Get-Free",
  },
};

export async function SitePage({ page }: { page: NotionPageData }) {
  const routeEntries = hasChildPageBlocks(page.blocks)
    ? await getRoutes().catch(() => [])
    : undefined;
  const childPageCards =
    routeEntries && shouldRenderChildPageCards(page.slug)
      ? await getChildPageCards(collectChildPageCardSeeds(page.blocks, routeEntries))
      : undefined;
  const hiddenBlockIds =
    !shouldRenderChildPageCards(page.slug) && await isChildPageCardSourcePage(page.id)
      ? collectCardPreviewHiddenBlockIds(page.blocks)
      : undefined;
  const pageClass = toPageClass(page.slug);
  const articleId = `block-${page.id.replace(/-/g, "")}`;
  const topAction = topActionBySlug[page.slug];
  const everyDaysCanvasMarkerIndex =
    page.slug === "/every-days" ? findEveryDaysCanvasMarkerIndex(page.blocks) : -1;
  const blocksBeforeEveryDaysCanvas =
    everyDaysCanvasMarkerIndex >= 0
      ? page.blocks.slice(0, everyDaysCanvasMarkerIndex)
      : page.blocks;
  const blocksAfterEveryDaysCanvas =
    everyDaysCanvasMarkerIndex >= 0
      ? page.blocks.slice(everyDaysCanvasMarkerIndex + 1)
      : [];
  const shouldRenderEveryDaysCanvasAtMarker =
    page.slug === "/every-days" && everyDaysCanvasMarkerIndex >= 0;
  const shouldRenderEveryDaysCanvasFallback =
    page.slug === "/every-days" && everyDaysCanvasMarkerIndex < 0;
  const priorityImageIds = collectPriorityImageIds(
    page.blocks,
    priorityImageLoadLimit
  );
  const priorityImageSources = collectPriorityImageSources(
    page.blocks,
    priorityImagePreloadLimit
  );
  const everyDaysLatestArtworkId =
    page.slug === "/every-days" ? getLatestEveryDaysArtworkId() : null;

  for (const source of priorityImageSources) {
    preload(source, {
      as: "image",
      fetchPriority: "high",
      referrerPolicy: "no-referrer",
    });

    try {
      const origin = new URL(source).origin;
      preconnect(origin);
      prefetchDNS(origin);
    } catch {
      // Ignore invalid upstream URLs from Notion content.
    }
  }

  return (
    <main id={`page-${pageClass}`} className={`site-content page__${pageClass}`}>
      {topAction ? (
        <div className="site-top-actions">
          <div className="site-top-actions__meta">
            <a className={topAction.metaClassName} href={topAction.metaHref}>
              {topAction.metaLabel}
            </a>
            <span className="site-top-actions__release">
              Released: {topAction.releaseYear}
            </span>
          </div>
          <a className={topAction.buttonClassName} href={topAction.buttonHref}>
            {topAction.buttonLabel}
          </a>
        </div>
      ) : everyDaysLatestArtworkId !== null ? (
        <div className="site-top-actions">
          <div className="site-top-actions__meta">
            <span className="site-top-stat">
              {`Artworks: ${everyDaysLatestArtworkId}`}
            </span>
            <span className="site-top-actions__release">Since 2024</span>
          </div>
        </div>
      ) : null}
      {shouldRenderEveryDaysCanvasFallback ? (
        <section className="notion-root max-width">
          <EveryDays2026Viewer />
        </section>
      ) : null}

      <article id={articleId} className="notion-root max-width">
        <NotionRenderer
          blocks={blocksBeforeEveryDaysCanvas}
          pageSlug={page.slug}
          routeEntries={routeEntries}
          childPageCards={childPageCards}
          hiddenBlockIds={hiddenBlockIds}
          priorityImageIds={priorityImageIds}
        />
        {shouldRenderEveryDaysCanvasAtMarker ? <EveryDays2026Viewer /> : null}
        {blocksAfterEveryDaysCanvas.length > 0 ? (
          <NotionRenderer
            blocks={blocksAfterEveryDaysCanvas}
            pageSlug={page.slug}
            routeEntries={routeEntries}
            childPageCards={childPageCards}
            hiddenBlockIds={hiddenBlockIds}
            priorityImageIds={priorityImageIds}
          />
        ) : null}
      </article>
    </main>
  );
}
