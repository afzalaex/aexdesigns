import { NotionRenderer } from "@/components/NotionRenderer";
import {
  getPageBySlug,
  getRoutes,
  type NotionBlock,
  type NotionPageData,
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

type ExpandableChildRoute = {
  slug: string;
  label: string;
};

type ExpandableRouteGroups = Record<string, ExpandableChildRoute[]>;

function normalizePageId(raw: string): string {
  return raw.replace(/-/g, "").toLowerCase();
}

function collectChildPageBlocks(
  blocks: NotionBlock[] | undefined
): Array<{ id: string; title: string }> {
  if (!blocks || blocks.length === 0) {
    return [];
  }

  const childPages: Array<{ id: string; title: string }> = [];

  for (const block of blocks) {
    if (block.type === "child_page") {
      childPages.push({
        id: block.id,
        title: block.child_page.title,
      });
    }

    if (block.children?.length) {
      childPages.push(...collectChildPageBlocks(block.children));
    }
  }

  return childPages;
}

function childSlugByPageId(routeEntries: Array<{ slug: string; pageId?: string }>): Map<string, string> {
  const byPageId = new Map<string, string>();

  for (const route of routeEntries) {
    if (typeof route.pageId !== "string" || route.pageId.trim().length === 0) {
      continue;
    }

    byPageId.set(normalizePageId(route.pageId), route.slug);
  }

  return byPageId;
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
  const routeEntries = await getRoutes().catch(() => []);
  let expandableRouteGroups: ExpandableRouteGroups | undefined;

  if (page.slug === "/") {
    const parentSlugs = [
      "/onchain",
      "/offchain",
      "/digital-design-assets",
      "/digitaldesignassets",
      "/archive",
    ];
    const slugById = childSlugByPageId(routeEntries);
    const groups: ExpandableRouteGroups = {};

    for (const parentSlug of parentSlugs) {
      try {
        const parentPage = await getPageBySlug(parentSlug);
        if (!parentPage) {
          continue;
        }

        const childPages = collectChildPageBlocks(parentPage.blocks);
        const children: ExpandableChildRoute[] = [];

        for (const childPage of childPages) {
          const childSlug = slugById.get(normalizePageId(childPage.id));
          if (!childSlug || /-type-tester$/i.test(childSlug)) {
            continue;
          }

          children.push({
            slug: childSlug,
            label: childPage.title,
          });
        }

        if (children.length > 0) {
          groups[parentSlug] = Array.from(
            new Map(children.map((child) => [child.slug, child])).values()
          );
        }
      } catch (error) {
        console.error("Failed to resolve expandable child pages for:", parentSlug, error);
      }
    }

    if (Object.keys(groups).length > 0) {
      expandableRouteGroups = groups;
    }
  }

  const pageClass = toPageClass(page.slug);
  const articleId = `block-${page.id.replace(/-/g, "")}`;
  const topAction = topActionBySlug[page.slug];

  return (
    <main id={`page-${pageClass}`} className={`site-content page__${pageClass}`}>
      {topAction ? (
        <div className="p5nels-top-actions">
          <div className="p5nels-top-actions__meta">
            <a className={topAction.metaClassName} href={topAction.metaHref}>
              {topAction.metaLabel}
            </a>
            <span className="p5nels-top-actions__release">
              Released: {topAction.releaseYear}
            </span>
          </div>
          <a className={topAction.buttonClassName} href={topAction.buttonHref}>
            {topAction.buttonLabel}
          </a>
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

      <article id={articleId} className="notion-root max-width">
        <NotionRenderer
          blocks={page.blocks}
          pageSlug={page.slug}
          routeEntries={routeEntries}
          expandableRouteGroups={expandableRouteGroups}
        />
      </article>
    </main>
  );
}
