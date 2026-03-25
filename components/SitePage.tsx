import { preconnect, prefetchDNS, preload } from "react-dom";
import { EveryDays2026Viewer } from "@/components/EveryDays2026Viewer";
import { NotionRenderer } from "@/components/NotionRenderer";
import everyDaysCollection2026 from "@/public/data/collection-2026.json";
import { resolveNotionImagePrimarySrc } from "@/lib/notion-images";
import { getRoutes, type NotionBlock, type NotionPageData } from "@/lib/notion";

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
      <div className="notion-header page">
        <div className="notion-header__cover no-cover no-icon" />
        <div className="notion-header__content max-width no-cover no-icon">
          <div className="notion-header__title-wrapper">
            <h1 className="notion-header__title">{page.title}</h1>
          </div>
          {page.description ? (
            <p className="notion-header__description">{page.description}</p>
          ) : null}
        </div>
      </div>

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
          priorityImageIds={priorityImageIds}
        />
        {shouldRenderEveryDaysCanvasAtMarker ? <EveryDays2026Viewer /> : null}
        {blocksAfterEveryDaysCanvas.length > 0 ? (
          <NotionRenderer
            blocks={blocksAfterEveryDaysCanvas}
            pageSlug={page.slug}
            routeEntries={routeEntries}
            priorityImageIds={priorityImageIds}
          />
        ) : null}
      </article>
    </main>
  );
}
