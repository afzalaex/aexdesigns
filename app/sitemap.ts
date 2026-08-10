import type { MetadataRoute } from "next";
import { getAllSlugs, getSiteUrl } from "@/lib/notion";

export const revalidate = 3600;

/** Always include these even if route discovery is briefly empty. */
const staticSlugs = ["/typeplayground", "/ta", "/da", "/archive"];

/**
 * Old paths that permanently redirect — keep them out of the sitemap so
 * crawlers prefer the canonical URLs.
 */
const redirectedSlugs = new Set([
  "/assets",
  "/type-playground",
  "/designassetpack1",
  "/designassetpack2",
]);

const priorityBySlug: Record<string, number> = {
  "/": 1,
  "/ta": 0.9,
  "/da": 0.9,
  "/archive": 0.8,
  "/typeplayground": 0.75,
  "/about": 0.7,
  "/every-days": 0.7,
};

function normalizeSlug(raw: string): string {
  const withoutDomain = raw.trim().replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutDomain.split(/[?#]/)[0] ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const cleaned = withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");

  return cleaned || "/";
}

function priorityFor(slug: string): number {
  if (priorityBySlug[slug] !== undefined) {
    return priorityBySlug[slug];
  }

  const depth = slug.split("/").filter(Boolean).length;
  if (depth <= 1) {
    return 0.6;
  }

  return 0.5;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  let routeSlugs: string[] = [];

  try {
    routeSlugs = await getAllSlugs();
  } catch (error) {
    console.error("sitemap: failed to load route slugs", error);
  }

  const allSlugs = Array.from(
    new Set(["/", ...routeSlugs, ...staticSlugs].map(normalizeSlug))
  )
    .filter((slug) => !redirectedSlugs.has(slug))
    .filter((slug) => !/-type-tester$/i.test(slug))
    .sort((a, b) => a.localeCompare(b));

  return allSlugs.map((slug) => ({
    url: new URL(slug, siteUrl).toString(),
    changeFrequency: slug === "/" || slug === "/ta" || slug === "/da" ? "weekly" : "monthly",
    priority: priorityFor(slug),
  }));
}
