import type { ReactNode } from "react";
import Link from "next/link";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import routeMap from "@/content/route-map.json";
import type { NotionBlock } from "@/lib/notion";
import { TypeTester } from "@/components/TypeTester";

type TesterConfig = {
  fontFamily: string;
  fontWoff2: string;
  fontWoff?: string;
  fontSizePx?: number;
  lineHeight?: number;
  textColor?: string;
};

type TesterMarker = {
  alias?: string;
  caption?: string;
};

type RouteMapEntry = {
  slug?: string;
  pageId?: string;
  title?: string;
};

type RouteInputEntry = {
  slug: string;
  pageId?: string;
  title?: string;
};

type ExpandableChildRoute = {
  slug: string;
  label: string;
};

type RouteRenderContextValue = {
  slugByPageId: Map<string, string>;
  childRoutesByParentSlug: Map<string, ExpandableChildRoute[]>;
};

const expandableParentKeys = new Set([
  "onchain",
  "offchain",
  "digitaldesignassets",
  "archive",
]);

const testerConfigs: Record<string, TesterConfig> = {
  "/typecheck-type-tester": {
    fontFamily: "TypeCheck",
    fontWoff2:
      "https://cdn.jsdelivr.net/gh/afzalaex/TypeCheck@main/TypeCheck.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/TypeCheck@main/TypeCheck.woff",
    fontSizePx: 60,
    lineHeight: 1.12,
    textColor: "#fff",
  },
  "/aextract-type-tester": {
    fontFamily: "Aextract",
    fontWoff2:
      "https://cdn.jsdelivr.net/gh/afzalaex/Aextract@main/Aextract-Regular.woff2",
    fontWoff:
      "https://cdn.jsdelivr.net/gh/afzalaex/Aextract@main/Aextract-Regular.woff",
    fontSizePx: 60,
    lineHeight: 1.12,
    textColor: "#fff",
  },
  "/nounty-type-tester": {
    fontFamily: "Nounty",
    fontWoff2: "https://cdn.jsdelivr.net/gh/afzalaex/Nounty@main/Nounty.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/Nounty@main/Nounty.woff",
    fontSizePx: 56,
    lineHeight: 1.1,
    textColor: "#fff",
  },
  "/aexpective-type-tester": {
    fontFamily: "AEXPECTIVE",
    fontWoff2:
      "https://cdn.jsdelivr.net/gh/afzalaex/AEXPECTIVE@main/AEXPECTIVE.woff2",
    fontWoff:
      "https://cdn.jsdelivr.net/gh/afzalaex/AEXPECTIVE@main/AEXPECTIVE.woff",
    fontSizePx: 42,
    lineHeight: 1.1,
    textColor: "#fff",
  },
  "/aextract36-type-tester": {
    fontFamily: "AEXTRACT36",
    fontWoff2:
      "https://cdn.jsdelivr.net/gh/afzalaex/AEXTRACT36@main/AEXTRACT36.woff2",
    fontWoff:
      "https://cdn.jsdelivr.net/gh/afzalaex/AEXTRACT36@main/AEXTRACT36.woff",
    fontSizePx: 36,
    lineHeight: 1.1,
    textColor: "#fff",
  },
};

const testerAliasToPath: Record<string, string> = {
  typecheck: "/typecheck-type-tester",
  aextract: "/aextract-type-tester",
  aextract36: "/aextract36-type-tester",
  nounty: "/nounty-type-tester",
  aexpective: "/aexpective-type-tester",
};

const defaultTesterPathByPageSlug: Record<string, string> = {
  "/typecheck": "/typecheck-type-tester",
  "/aextract": "/aextract-type-tester",
  "/aextract36": "/aextract36-type-tester",
  "/nounty": "/nounty-type-tester",
  "/aexpective": "/aexpective-type-tester",
};

const PAGE_ICON_PATH =
  "M4.35645 15.4678H11.6367C13.0996 15.4678 13.8584 14.6953 13.8584 13.2256V7.02539C13.8584 6.0752 13.7354 5.6377 13.1406 5.03613L9.55176 1.38574C8.97754 0.804688 8.50586 0.667969 7.65137 0.667969H4.35645C2.89355 0.667969 2.13477 1.44043 2.13477 2.91016V13.2256C2.13477 14.7021 2.89355 15.4678 4.35645 15.4678ZM4.46582 14.1279C3.80273 14.1279 3.47461 13.7793 3.47461 13.1436V2.99219C3.47461 2.36328 3.80273 2.00781 4.46582 2.00781H7.37793V5.75391C7.37793 6.73145 7.86328 7.20312 8.83398 7.20312H12.5186V13.1436C12.5186 13.7793 12.1836 14.1279 11.5205 14.1279H4.46582ZM8.95703 6.02734C8.67676 6.02734 8.56055 5.9043 8.56055 5.62402V2.19238L12.334 6.02734H8.95703ZM10.4336 9.00098H5.42969C5.16992 9.00098 4.98535 9.19238 4.98535 9.43164C4.98535 9.67773 5.16992 9.86914 5.42969 9.86914H10.4336C10.6797 9.86914 10.8643 9.67773 10.8643 9.43164C10.8643 9.19238 10.6797 9.00098 10.4336 9.00098ZM10.4336 11.2979H5.42969C5.16992 11.2979 4.98535 11.4893 4.98535 11.7354C4.98535 11.9746 5.16992 12.1592 5.42969 12.1592H10.4336C10.6797 12.1592 10.8643 11.9746 10.8643 11.7354C10.8643 11.4893 10.6797 11.2979 10.4336 11.2979Z";

function normalizePageId(raw: string): string {
  return raw.replace(/-/g, "").toLowerCase();
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

function slugFromTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalizeSlug(normalized ? `/${normalized}` : "/");
}

function slugKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function childLabelForParent(
  parentSlug: string,
  childSlug: string,
  explicitTitle?: string
): string {
  const title = explicitTitle?.trim();
  if (title) {
    return title;
  }

  const prefix = `${normalizeSlug(parentSlug)}/`;
  const remainder = normalizeSlug(childSlug).startsWith(prefix)
    ? normalizeSlug(childSlug).slice(prefix.length)
    : normalizeSlug(childSlug).replace(/^\//, "");

  return remainder
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[-_]+/g, " "))
    .join(" / ");
}

function resolveRouteEntries(
  routeEntries?: RouteInputEntry[]
): RouteInputEntry[] {
  if (Array.isArray(routeEntries) && routeEntries.length > 0) {
    return routeEntries;
  }

  const fallbackEntries: RouteInputEntry[] = [];

  for (const entry of (Array.isArray(routeMap) ? routeMap : []) as RouteMapEntry[]) {
    if (typeof entry?.slug !== "string") {
      continue;
    }

    fallbackEntries.push({
      slug: entry.slug,
      pageId: typeof entry.pageId === "string" ? entry.pageId : undefined,
      title: typeof entry.title === "string" ? entry.title : undefined,
    });
  }

  return fallbackEntries;
}

function buildRouteRenderContext(
  routeEntries?: RouteInputEntry[]
): RouteRenderContextValue {
  const slugByPageId = new Map<string, string>();
  const childRoutesByParentSlug = new Map<string, ExpandableChildRoute[]>();
  const entries = resolveRouteEntries(routeEntries);

  for (const entry of entries) {
    const slug = normalizeSlug(entry.slug);
    const pageId = typeof entry.pageId === "string" ? entry.pageId.trim() : "";

    if (pageId) {
      slugByPageId.set(normalizePageId(pageId), slug);
    }

    if (/-type-tester$/i.test(slug)) {
      continue;
    }

    const segments = slug.replace(/^\//, "").split("/").filter(Boolean);
    if (segments.length < 2) {
      continue;
    }

    const parentSlug = `/${segments[0]}`;
    if (!expandableParentKeys.has(slugKey(parentSlug))) {
      continue;
    }

    const existing = childRoutesByParentSlug.get(parentSlug) ?? [];
    existing.push({
      slug,
      label: childLabelForParent(parentSlug, slug, entry.title),
    });
    childRoutesByParentSlug.set(parentSlug, existing);
  }

  for (const [parentSlug, children] of childRoutesByParentSlug.entries()) {
    const uniqueChildren = Array.from(
      new Map(children.map((child) => [child.slug, child])).values()
    ).sort((a, b) => a.slug.localeCompare(b.slug));

    childRoutesByParentSlug.set(parentSlug, uniqueChildren);
  }

  return { slugByPageId, childRoutesByParentSlug };
}

function blockDomId(id: string): string {
  return `block-${id.replace(/-/g, "")}`;
}

function headingAnchorId(id: string): string {
  return id.replace(/-/g, "");
}

function childPageBlockId(slug: string): string {
  const path = slug.replace(/^\//, "").replace(/\//g, "-");
  return `block-${path || "home"}`;
}

function joinRichText(items: RichTextItemResponse[]): string {
  return items.map((item) => item.plain_text).join("");
}

function isInternalHref(href: string): boolean {
  if (href.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(href);
    return ["aex.design", "www.aex.design"].includes(url.hostname);
  } catch {
    return false;
  }
}

function toInternalHref(href: string): string {
  if (href.startsWith("/")) {
    return href;
  }

  try {
    const url = new URL(href);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function normalizeEmbedPathname(pathname: string): string {
  const collapsed = pathname.replace(/\/+/g, "/");
  if (collapsed === "/") {
    return collapsed;
  }

  return collapsed.replace(/\/$/, "");
}

function normalizeEmbedUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, "https://aex.design");

    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function isEmbeddableUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function testerConfigFromUrl(rawUrl: string): TesterConfig | null {
  try {
    const parsed = new URL(rawUrl, "https://aex.design");
    const pathname = normalizeEmbedPathname(parsed.pathname);
    return testerConfigs[pathname] ?? null;
  } catch {
    return null;
  }
}

function parseTesterMarker(text: string): TesterMarker | null {
  const marker = text.trim();
  if (!marker) {
    return null;
  }

  const bracketMatch = marker.match(
    /^(?:\[\[|{{)\s*(?:tester|type[-\s]?tester)\s*(?::\s*([a-z0-9/_-]+))?(?:\s*\|\s*([^}\]]+))?\s*(?:\]\]|}})$/i
  );

  if (bracketMatch) {
    const alias = (bracketMatch[1] ?? "").trim().toLowerCase();
    const caption = (bracketMatch[2] ?? "").trim();

    return {
      alias: alias || undefined,
      caption: caption || undefined,
    };
  }

  const inlineMatch = marker.match(
    /^(?:tester|type[-\s]?tester)(?:\s*:\s*([a-z0-9/_-]+))?(?:\s*\|\s*(.+))?$/i
  );

  if (inlineMatch) {
    const alias = (inlineMatch[1] ?? "").trim().toLowerCase();
    const caption = (inlineMatch[2] ?? "").trim();

    return {
      alias: alias || undefined,
      caption: caption || undefined,
    };
  }

  return null;
}

function testerConfigFromAlias(alias: string): TesterConfig | null {
  const normalizedAlias = alias.trim().toLowerCase();
  if (!normalizedAlias) {
    return null;
  }

  const mappedPath =
    testerAliasToPath[normalizedAlias] ??
    (normalizedAlias.startsWith("/") ? normalizedAlias : `/${normalizedAlias}`);

  return testerConfigs[mappedPath] ?? null;
}

function testerConfigFromMarker(marker: TesterMarker, pageSlug?: string): TesterConfig | null {
  if (marker.alias) {
    return testerConfigFromAlias(marker.alias);
  }

  if (!pageSlug) {
    return null;
  }

  const defaultTesterPath = defaultTesterPathByPageSlug[pageSlug];
  return defaultTesterPath ? testerConfigs[defaultTesterPath] ?? null : null;
}

function textWithLineBreaks(text: string, keyBase: string): ReactNode {
  const lines = text.split("\n");

  return lines.map((line, index) => (
    <span key={`${keyBase}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function RichText({ items }: { items: RichTextItemResponse[] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map((item, index) => {
        const visibleText = item.plain_text.trim().length > 0 ? item.plain_text : item.href ?? "";
        let node: ReactNode = textWithLineBreaks(visibleText, `rt-${index}`);

        if (item.href) {
          const internal = isInternalHref(item.href);
          const href = internal ? toInternalHref(item.href) : item.href;

          node = internal ? (
            <Link
              href={href}
              className="notion-link link"
              data-server-link={true}
              data-link-uri={href}
              prefetch={false}
            >
              {node}
            </Link>
          ) : (
            <a
              href={href}
              className="notion-link link"
              data-server-link={false}
              data-link-uri={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {node}
            </a>
          );
        }

        if (item.annotations.code) {
          node = <code>{node}</code>;
        }
        if (item.annotations.bold) {
          node = <strong>{node}</strong>;
        }
        if (item.annotations.italic) {
          node = <em>{node}</em>;
        }
        if (item.annotations.strikethrough) {
          node = <s>{node}</s>;
        }
        if (item.annotations.underline) {
          node = <u>{node}</u>;
        }

        return <span key={`rich-${index}`}>{node}</span>;
      })}
    </>
  );
}

function BlockChildren({
  blocks,
  pageSlug,
  routeContext,
}: {
  blocks?: NotionBlock[];
  pageSlug?: string;
  routeContext: RouteRenderContextValue;
}) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <>
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          pageSlug={pageSlug}
          routeContext={routeContext}
        />
      ))}
    </>
  );
}

function PageIcon() {
  return (
    <svg
      className="notion-icon notion-icon__page"
      viewBox="0 0 16 16"
      width="18"
      height="18"
      style={{
        width: "20px",
        height: "20px",
        fontSize: "20px",
        fill: "var(--color-text-default-light)",
      }}
    >
      <path d={PAGE_ICON_PATH} />
    </svg>
  );
}

function Block({
  block,
  pageSlug,
  routeContext,
}: {
  block: NotionBlock;
  pageSlug?: string;
  routeContext: RouteRenderContextValue;
}) {
  switch (block.type) {
    case "heading_1":
      return (
        <>
          <span className="notion-heading__anchor" id={headingAnchorId(block.id)} />
          <h1 id={blockDomId(block.id)} className="notion-heading notion-semantic-string">
            <RichText items={block.heading_1.rich_text} />
          </h1>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );

    case "heading_2":
      return (
        <>
          <span className="notion-heading__anchor" id={headingAnchorId(block.id)} />
          <h2 id={blockDomId(block.id)} className="notion-heading notion-semantic-string">
            <RichText items={block.heading_2.rich_text} />
          </h2>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );

    case "heading_3":
      return (
        <>
          <span className="notion-heading__anchor" id={headingAnchorId(block.id)} />
          <h3 id={blockDomId(block.id)} className="notion-heading notion-semantic-string">
            <RichText items={block.heading_3.rich_text} />
          </h3>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );

    case "paragraph":
      {
        const paragraphText = joinRichText(block.paragraph.rich_text).trim();
        const marker = parseTesterMarker(paragraphText);
        const markerTesterConfig = marker
          ? testerConfigFromMarker(marker, pageSlug)
          : null;
        const markerCaption = marker?.caption;

        if (markerTesterConfig) {
          return (
            <TesterFigure
              id={blockDomId(block.id)}
              testerConfig={markerTesterConfig}
              caption={markerCaption}
            />
          );
        }
      }

      return (
        <>
          <p id={blockDomId(block.id)} className="notion-text notion-text__content notion-semantic-string">
            <RichText items={block.paragraph.rich_text} />
          </p>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );

    case "quote":
      return (
        <>
          <blockquote
            id={blockDomId(block.id)}
            className="notion-quote notion-text notion-semantic-string"
          >
            <RichText items={block.quote.rich_text} />
          </blockquote>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );

    case "bulleted_list_item":
      return (
        <ul className="notion-list notion-list-disc">
          <li id={blockDomId(block.id)} className="notion-text notion-semantic-string">
            <RichText items={block.bulleted_list_item.rich_text} />
            <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
          </li>
        </ul>
      );

    case "numbered_list_item":
      return (
        <ol className="notion-list notion-list-numbered">
          <li id={blockDomId(block.id)} className="notion-text notion-semantic-string">
            <RichText items={block.numbered_list_item.rich_text} />
            <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
          </li>
        </ol>
      );

    case "to_do":
      return (
        <>
          <label id={blockDomId(block.id)} className="notion-to-do__content">
            <input type="checkbox" checked={block.to_do.checked} readOnly />
            <span className="notion-text notion-semantic-string">
              <RichText items={block.to_do.rich_text} />
            </span>
          </label>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );

    case "toggle": {
      const toggleText = joinRichText(block.toggle.rich_text).trim();

      if (toggleText.toLowerCase().includes("not to be displayed")) {
        return null;
      }

      const hasChildren = Boolean(block.children?.length);

      return (
        <div id={blockDomId(block.id)} className="notion-toggle closed">
          <div className="notion-toggle__summary">
            <div className="notion-toggle__trigger">
              <div className="notion-toggle__trigger_icon">
                <span>{">"}</span>
              </div>
            </div>
            <span className="notion-semantic-string">
              <RichText items={block.toggle.rich_text} />
            </span>
          </div>
          {hasChildren ? (
            <div className="notion-toggle__content">
              <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
            </div>
          ) : null}
        </div>
      );
    }

    case "callout": {
      const icon = block.callout.icon?.type === "emoji" ? block.callout.icon.emoji : "";

      return (
        <>
          <div id={blockDomId(block.id)} className="notion-callout">
            <p className="notion-text notion-semantic-string">
              <span className="notion-page__icon">{icon}</span>
              <span>
                <RichText items={block.callout.rich_text} />
              </span>
            </p>
          </div>
          <BlockChildren blocks={block.children} pageSlug={pageSlug} routeContext={routeContext} />
        </>
      );
    }

    case "divider":
      return <hr id={blockDomId(block.id)} className="notion-divider" />;

    case "code":
      return (
        <div id={blockDomId(block.id)} className="notion-code">
          <pre data-language={block.code.language}>
            <code>{joinRichText(block.code.rich_text)}</code>
          </pre>
        </div>
      );

    case "image": {
      const src =
        block.image.type === "external"
          ? block.image.external.url
          : `/api/notion-image/${encodeURIComponent(block.id)}`;
      const captionText = joinRichText(block.image.caption).trim();

      return (
        <figure id={blockDomId(block.id)} className="notion-image page-width">
          <span style={{ display: "contents" }}>
            <img src={src} alt={captionText || "image"} loading="lazy" />
          </span>
          {captionText ? (
            <figcaption className="notion-caption notion-semantic-string">
              <RichText items={block.image.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    }

    case "bookmark":
      return (
        <p id={blockDomId(block.id)} className="notion-text notion-text__content notion-semantic-string">
          <a href={block.bookmark.url} className="notion-link link" data-link-uri={block.bookmark.url}>
            {block.bookmark.url}
          </a>
        </p>
      );

    case "embed": {
      const captionText = joinRichText(block.embed.caption).trim();
      const embedUrl = normalizeEmbedUrl(block.embed.url);
      const testerConfig = testerConfigFromUrl(embedUrl);

      if (testerConfig) {
        return (
          <TesterFigure
            id={blockDomId(block.id)}
            testerConfig={testerConfig}
            caption={
              captionText ? (
                <RichText items={block.embed.caption} />
              ) : undefined
            }
          />
        );
      }

      if (isEmbeddableUrl(embedUrl)) {
        return (
          <figure id={blockDomId(block.id)} className="notion-embed page-width notion-block aex-generic-embed">
            <span className="notion-embed__container__wrapper">
              <span className="notion-embed__container">
                <iframe
                  src={embedUrl}
                  title={embedUrl}
                  sandbox="allow-scripts allow-popups allow-forms allow-same-origin allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  allowFullScreen
                  loading="lazy"
                  frameBorder={0}
                />
              </span>
            </span>
            {captionText ? (
              <figcaption className="notion-caption notion-semantic-string">
                <RichText items={block.embed.caption} />
              </figcaption>
            ) : null}
          </figure>
        );
      }

      return (
        <section id={blockDomId(block.id)} className="notion-embed page-width notion-block">
          <p className="notion-text notion-text__content notion-semantic-string">
            <a href={embedUrl} className="notion-link link" data-link-uri={embedUrl}>
              {embedUrl}
            </a>
          </p>
          {captionText ? (
            <figcaption className="notion-caption notion-semantic-string">
              <RichText items={block.embed.caption} />
            </figcaption>
          ) : null}
        </section>
      );
    }

    case "child_page": {
      const mappedSlug = routeContext.slugByPageId.get(normalizePageId(block.id));
      const slug = mappedSlug ?? slugFromTitle(block.child_page.title);

      if (/-type-tester$/i.test(slug)) {
        return null;
      }

      const expandableChildren = routeContext.childRoutesByParentSlug.get(slug);

      if (pageSlug === "/" && expandableChildren && expandableChildren.length > 0) {
        return (
          <div id={childPageBlockId(slug)} className="notion-page-group">
            <Link
              href={slug}
              className="notion-page notion-page-group__parent"
              data-server-link={true}
              data-link-uri={slug}
              prefetch={false}
            >
              <span className="notion-page__icon">
                <PageIcon />
              </span>
              <span className="notion-page__title notion-semantic-string">
                {block.child_page.title}
              </span>
            </Link>
            <div className="notion-page-group__children">
              {expandableChildren.map((child) => (
                <Link
                  key={child.slug}
                  href={child.slug}
                  className="notion-page notion-page-group__child"
                  data-server-link={true}
                  data-link-uri={child.slug}
                  prefetch={false}
                >
                  <span className="notion-page__title notion-semantic-string">
                    {child.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      }

      return (
        <Link
          id={childPageBlockId(slug)}
          href={slug}
          className="notion-page"
          data-server-link={true}
          data-link-uri={slug}
          prefetch={false}
        >
          <span className="notion-page__icon">
            <PageIcon />
          </span>
          <span className="notion-page__title notion-semantic-string">
            {block.child_page.title}
          </span>
        </Link>
      );
    }

    default:
      return null;
  }
}

function TesterFigure({
  id,
  testerConfig,
  caption,
}: {
  id: string;
  testerConfig: TesterConfig;
  caption?: ReactNode;
}) {
  return (
    <figure id={id} className="notion-embed page-width notion-block aex-inline-embed">
      <TypeTester
        id={id}
        fontFamily={testerConfig.fontFamily}
        fontWoff2={testerConfig.fontWoff2}
        fontWoff={testerConfig.fontWoff}
        fontSizePx={testerConfig.fontSizePx}
        lineHeight={testerConfig.lineHeight}
        textColor={testerConfig.textColor}
      />
      {caption ? (
        <figcaption className="notion-caption notion-semantic-string">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function NotionRenderer({
  blocks,
  pageSlug,
  routeEntries,
}: {
  blocks: NotionBlock[];
  pageSlug?: string;
  routeEntries?: RouteInputEntry[];
}) {
  const routeContext = buildRouteRenderContext(routeEntries);

  return (
    <>
      {blocks.map((block) => (
        <Block
          key={block.id}
          block={block}
          pageSlug={pageSlug}
          routeContext={routeContext}
        />
      ))}
    </>
  );
}


