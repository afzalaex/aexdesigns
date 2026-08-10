/**
 * Card presentation for Notion entries that aren't child pages.
 *
 * On card-layout parents (/ta, /da, /archive), a paragraph/bookmark link
 * whose target is listed here is rendered as a real card. Notion still owns:
 * - presence (remove the link in Notion → card goes away)
 * - title (link text, unless overridden)
 * - href (link URL, unless overridden)
 * - order (where the block sits on the page)
 *
 * This file only supplies description + thumbnail (things the link doesn't have).
 */
export type LinkCardPresentation = {
  description?: string;
  thumbnailUrl?: string;
  thumbnailFallbackUrl?: string;
  /** Optional title override; defaults to Notion link text. */
  title?: string;
  /**
   * Optional href override after resolving the Notion link.
   * Example: shell slug → real app route, or force https store URL.
   */
  href?: string;
};

/** Remap an existing Notion child-page card by its Notion slug. */
export type NotionCardOverride = {
  href?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  thumbnailFallbackUrl?: string;
};

export const notionCardOverridesBySlug: Record<string, NotionCardOverride> = {};

/**
 * Presentation keyed by card target key from hrefToCardKey():
 * - main site paths: "/typeplayground"
 * - other hosts: "store.aex.design" (path "/" only) or "host/path"
 */
export const linkCardPresentationByPath: Record<string, LinkCardPresentation> = {
  "avvepen.aex.design": {
    title: "Avvepen",
    description: "Make your own Avvatars × Opepen",
    thumbnailUrl: "/assets/card-thumbnails/avvepen.svg",
    href: "https://avvepen.aex.design/",
  },
  "collfo.aex.design": {
    title: "Collfo",
    description: "Find every collector of any artist",
    thumbnailUrl: "/assets/card-thumbnails/collfo.svg",
    href: "https://collfo.aex.design/",
  },
  "/typeplayground": {
    description: "Explore my typefaces",
    thumbnailUrl: "/assets/card-thumbnails/type-playground.svg",
  },
  // In case Notion ever links the shell slug instead of the app route.
  "/type-playground": {
    href: "/typeplayground",
    description: "Explore my typefaces",
    thumbnailUrl: "/assets/card-thumbnails/type-playground.svg",
  },
  "store.aex.design": {
    title: "Store",
    description: "Explore all assets on Gumroad",
    thumbnailUrl: "/assets/card-thumbnails/store.svg",
    href: "https://store.aex.design/",
  },
};

export function getNotionCardOverride(
  pageSlug: string
): NotionCardOverride | undefined {
  return notionCardOverridesBySlug[normalizeParentSlug(pageSlug)];
}

export function getLinkCardPresentation(
  path: string
): LinkCardPresentation | undefined {
  return linkCardPresentationByPath[normalizeParentSlug(path)];
}

/**
 * Stable lookup key for a link URL used as a card.
 * - aex.design / www.aex.design → site path ("/typeplayground")
 * - other hosts → "hostname" or "hostname/path"
 * - relative paths → normalized path
 */
export function hrefToCardKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      const path = (url.pathname.replace(/\/+$/, "") || "/") as string;

      if (host === "aex.design") {
        return path.startsWith("/") ? path : `/${path}`;
      }

      if (path === "/") {
        return host;
      }

      return `${host}${path.startsWith("/") ? path : `/${path}`}`;
    }
  } catch {
    return null;
  }

  const withoutQuery = trimmed.split(/[?#]/)[0] ?? "";
  const withSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const cleaned = withSlash.replace(/\/+/g, "/").replace(/\/$/, "");
  return cleaned || "/";
}

/** @deprecated Use hrefToCardKey */
export function hrefToPath(raw: string): string | null {
  return hrefToCardKey(raw);
}

function normalizeParentSlug(pageSlug: string): string {
  // Host keys like "store.aex.design" must not get a leading slash.
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(pageSlug.trim())) {
    const trimmed = pageSlug.trim().replace(/\/+$/, "");
    return trimmed.toLowerCase();
  }

  const normalized = pageSlug.trim().replace(/\/+$/, "") || "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
