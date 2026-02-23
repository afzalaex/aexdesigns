import type { Metadata } from "next";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  getPageBySlug,
  getRoutes,
  getSiteUrl,
  type NotionBlock,
  type RouteEntry,
} from "@/lib/notion";
import { HomepageLayout, type HomepageLinks } from "@/components/HomepageLayout";

export const revalidate = 3600;

const internalLinkCandidates = {
  onchain: ["/onchain"],
  offchain: ["/offchain"],
  digitalAssets: ["/dda", "/digital-design-assets", "/digitaldesignassets"],
  archive: ["/archive"],
} as const;

const externalLinkFallbacks = {
  newsletter: "https://letter.aex.design/",
  x: "https://x.com/aexdesigns",
  ig: "https://instagram.com/aex_designs",
  gh: "https://github.com/afzalaex",
} as const;

type HomepageLinkKey = keyof HomepageLinks;
type InternalHomepageLinkKey = keyof typeof internalLinkCandidates;
type HomepageLinkOverrides = Partial<Record<HomepageLinkKey, string>>;

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
}

function parseUrlOrPath(rawHref: string): URL | null {
  const trimmed = rawHref.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    if (trimmed.startsWith("/")) {
      return new URL(trimmed, "https://aex.design");
    }

    return new URL(trimmed);
  } catch {
    return null;
  }
}

function isInternalHostname(hostname: string): boolean {
  return ["aex.design", "www.aex.design", "localhost"].includes(hostname);
}

function toInternalPath(rawHref: string): string | null {
  const parsed = parseUrlOrPath(rawHref);
  if (!parsed) {
    return null;
  }

  if (!isInternalHostname(parsed.hostname)) {
    return null;
  }

  return normalizePath(parsed.pathname);
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function keyFromLabel(label: string): HomepageLinkKey | null {
  switch (label) {
    case "onchain":
      return "onchain";
    case "offchain":
      return "offchain";
    case "digitaldesignassets":
    case "digitalassets":
    case "dda":
      return "digitalAssets";
    case "newsletter":
    case "letter":
    case "letters":
      return "newsletter";
    case "archive":
      return "archive";
    case "x":
    case "twitter":
      return "x";
    case "ig":
    case "instagram":
      return "ig";
    case "gh":
    case "github":
      return "gh";
    default:
      return null;
  }
}

function keyFromHref(rawHref: string): HomepageLinkKey | null {
  const internalPath = toInternalPath(rawHref);
  if (internalPath) {
    if (internalPath === "/onchain") {
      return "onchain";
    }

    if (internalPath === "/offchain") {
      return "offchain";
    }

    if (
      internalPath === "/dda" ||
      internalPath === "/digital-design-assets" ||
      internalPath === "/digitaldesignassets"
    ) {
      return "digitalAssets";
    }

    if (internalPath === "/archive") {
      return "archive";
    }
  }

  const parsed = parseUrlOrPath(rawHref);
  if (!parsed) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  if (host.endsWith("x.com") || host.endsWith("twitter.com")) {
    return "x";
  }

  if (host.endsWith("instagram.com")) {
    return "ig";
  }

  if (host.endsWith("github.com")) {
    return "gh";
  }

  if (host.endsWith("letter.aex.design") || host.endsWith("substack.com")) {
    return "newsletter";
  }

  return null;
}

function canonicalHrefForKey(key: HomepageLinkKey, rawHref: string): string | null {
  const trimmed = rawHref.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (
    key === "onchain" ||
    key === "offchain" ||
    key === "digitalAssets" ||
    key === "archive"
  ) {
    return toInternalPath(trimmed);
  }

  return trimmed;
}

function collectLinkedRichText(blocks: NotionBlock[] | undefined): RichTextItemResponse[] {
  if (!blocks || blocks.length === 0) {
    return [];
  }

  const items: RichTextItemResponse[] = [];

  const walk = (currentBlocks: NotionBlock[]) => {
    for (const block of currentBlocks) {
      const blockData = block as any;
      const payload = blockData[blockData.type];
      const richText = payload?.rich_text;

      if (Array.isArray(richText)) {
        for (const item of richText) {
          if (item && typeof item.plain_text === "string") {
            items.push(item as RichTextItemResponse);
          }
        }
      }

      if (Array.isArray(block.children) && block.children.length > 0) {
        walk(block.children);
      }
    }
  };

  walk(blocks);

  return items;
}

function extractHomepageLinkOverrides(blocks: NotionBlock[] | undefined): HomepageLinkOverrides {
  const linkedTextItems = collectLinkedRichText(blocks);
  const overrides: HomepageLinkOverrides = {};

  for (const item of linkedTextItems) {
    if (!item.href) {
      continue;
    }

    const byLabel = keyFromLabel(normalizeLabel(item.plain_text));
    const byHref = keyFromHref(item.href);

    for (const candidate of [byLabel, byHref]) {
      if (!candidate || overrides[candidate]) {
        continue;
      }

      const canonicalHref = canonicalHrefForKey(candidate, item.href);
      if (!canonicalHref) {
        continue;
      }

      overrides[candidate] = canonicalHref;
      break;
    }
  }

  return overrides;
}

function resolveInternalLink(
  key: InternalHomepageLinkKey,
  overrides: HomepageLinkOverrides,
  routeEntries: RouteEntry[]
): string {
  const override = overrides[key];
  if (override && override.startsWith("/")) {
    return override;
  }

  const routeSlugs = new Set(routeEntries.map((route) => route.slug));
  const candidates = internalLinkCandidates[key];

  for (const candidate of candidates) {
    if (routeSlugs.has(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function resolveHomepageLinks(
  overrides: HomepageLinkOverrides,
  routeEntries: RouteEntry[]
): HomepageLinks {
  return {
    onchain: resolveInternalLink("onchain", overrides, routeEntries),
    offchain: resolveInternalLink("offchain", overrides, routeEntries),
    digitalAssets: resolveInternalLink("digitalAssets", overrides, routeEntries),
    archive: resolveInternalLink("archive", overrides, routeEntries),
    newsletter: overrides.newsletter ?? externalLinkFallbacks.newsletter,
    x: overrides.x ?? externalLinkFallbacks.x,
    ig: overrides.ig ?? externalLinkFallbacks.ig,
    gh: overrides.gh ?? externalLinkFallbacks.gh,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("/").catch(() => null);
  const url = new URL("/", getSiteUrl()).toString();

  if (!page) {
    return {
      alternates: { canonical: url },
    };
  }

  return {
    title: page.title,
    alternates: { canonical: url },
  };
}

export default async function HomePage() {
  const [homePage, routeEntries] = await Promise.all([
    getPageBySlug("/").catch(() => null),
    getRoutes().catch(() => [] as RouteEntry[]),
  ]);
  const overrides = extractHomepageLinkOverrides(homePage?.blocks);
  const links = resolveHomepageLinks(overrides, routeEntries);

  return <HomepageLayout links={links} />;
}
