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
  href: string;
  label: string;
  external?: boolean;
};

type ExpandableRouteGroups = Record<string, ExpandableChildRoute[]>;

function normalizePageId(raw: string): string {
  return raw.replace(/-/g, "").toLowerCase();
}

function isInternalHref(href: string): boolean {
  if (href.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(href);
    return ["aex.design", "www.aex.design"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function toInternalHref(href: string): string {
  if (href.startsWith("/")) {
    return href;
  }

  try {
    const parsed = new URL(href);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function keepOnlyOnchainCoreItems(items: ExpandableChildRoute[]): ExpandableChildRoute[] {
  const orderedMatchers: Array<{
    key: string;
    matches: (item: ExpandableChildRoute) => boolean;
  }> = [
    {
      key: "every-days",
      matches: (item) => {
        const label = normalizeMatchText(item.label);
        const href = normalizeMatchText(item.href);
        return item.href === "/every-days" || label.includes("e very days") || label.includes("every days") || href.includes("every days");
      },
    },
    {
      key: "collections",
      matches: (item) => {
        const label = normalizeMatchText(item.label);
        return item.href === "/collections" || label.includes("collections");
      },
    },
    {
      key: "opepen",
      matches: (item) => {
        const label = normalizeMatchText(item.label);
        const href = normalizeMatchText(item.href);
        return label.includes("opepen") || href.includes("opepen");
      },
    },
    {
      key: "punkism",
      matches: (item) => {
        const label = normalizeMatchText(item.label);
        const href = normalizeMatchText(item.href);
        return label.includes("punkism") || href.includes("punkism");
      },
    },
    {
      key: "opensea",
      matches: (item) => {
        const label = normalizeMatchText(item.label);
        const href = normalizeMatchText(item.href);
        return label.includes("opensea") || href.includes("opensea");
      },
    },
  ];

  const picked: ExpandableChildRoute[] = [];
  const used = new Set<string>();

  for (const matcher of orderedMatchers) {
    const match = items.find((item) => {
      const key = `${item.external ? "external" : "internal"}::${item.href}`;
      return !used.has(key) && matcher.matches(item);
    });

    if (!match) {
      continue;
    }

    const key = `${match.external ? "external" : "internal"}::${match.href}`;
    used.add(key);
    picked.push(match);
  }

  return picked;
}

function isDigitalAssetsParentSlug(slug: string): boolean {
  return slug === "/digital-design-assets" || slug === "/digitaldesignassets";
}

function appendDigitalAssetsTailItems(
  items: ExpandableChildRoute[]
): ExpandableChildRoute[] {
  const extras: ExpandableChildRoute[] = [
    {
      href: "/typeplayground",
      label: "Type Playground",
    },
    {
      href: "https://store.aex.design",
      label: "Store",
      external: true,
    },
  ];

  function normalizeMatch(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function isTypePlayground(item: ExpandableChildRoute): boolean {
    const href = normalizeMatch(item.href);
    const label = normalizeMatch(item.label);
    return (
      href === "typeplayground" ||
      href === "type-playground".replace(/[^a-z0-9]+/g, "") ||
      label === "typeplayground"
    );
  }

  function isStore(item: ExpandableChildRoute): boolean {
    const href = normalizeMatch(item.href);
    const label = normalizeMatch(item.label);
    return href.includes("storeaexdesign") || label === "store";
  }

  const baseItems = items.filter((item) => !isTypePlayground(item) && !isStore(item));
  return [...baseItems, ...extras];
}

function collectExpandableItems(
  blocks: NotionBlock[] | undefined,
  slugById: Map<string, string>,
  includeParagraphLinks: boolean
): ExpandableChildRoute[] {
  if (!blocks || blocks.length === 0) {
    return [];
  }

  const items: ExpandableChildRoute[] = [];
  const seen = new Set<string>();

  function pushUnique(item: ExpandableChildRoute): void {
    const key = `${item.external ? "external" : "internal"}::${item.href}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push(item);
  }

  function walk(currentBlocks: NotionBlock[]): void {
    for (const block of currentBlocks) {
      if (block.type === "child_page") {
        const slug = slugById.get(normalizePageId(block.id));
        if (slug && !/-type-tester$/i.test(slug)) {
          pushUnique({
            href: slug,
            label: block.child_page.title,
          });
        }
      }

      if (includeParagraphLinks && block.type === "paragraph") {
        for (const richItem of block.paragraph.rich_text) {
          if (!richItem.href) {
            continue;
          }

          const label = richItem.plain_text.trim() || richItem.href;
          const internal = isInternalHref(richItem.href);

          pushUnique({
            href: internal ? toInternalHref(richItem.href) : richItem.href,
            label,
            external: !internal,
          });
        }
      }

      if (block.children?.length) {
        walk(block.children);
      }
    }
  }

  walk(blocks);

  return items;
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

        const includeParagraphLinks = parentSlug === "/onchain";
        const children = collectExpandableItems(
          parentPage.blocks,
          slugById,
          includeParagraphLinks
        );

        const finalChildren =
          parentSlug === "/onchain"
            ? keepOnlyOnchainCoreItems(children)
            : isDigitalAssetsParentSlug(parentSlug)
              ? appendDigitalAssetsTailItems(children)
              : children;

        if (finalChildren.length > 0) {
          groups[parentSlug] = Array.from(
            new Map(
              finalChildren.map((child) => [
                `${child.external ? "external" : "internal"}::${child.href}`,
                child,
              ])
            ).values()
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
