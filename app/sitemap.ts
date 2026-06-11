import type { MetadataRoute } from "next";
import { getAllSlugs, getSiteUrl } from "@/lib/notion";

export const revalidate = 3600;

const staticSlugs = ["/typeplayground"];

function normalizeSlug(raw: string): string {
  const withoutDomain = raw.trim().replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutDomain.split(/[?#]/)[0] ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const cleaned = withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");

  return cleaned || "/";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const routeSlugs = await getAllSlugs();
  const allSlugs = Array.from(
    new Set(["/", ...routeSlugs, ...staticSlugs].map(normalizeSlug))
  ).sort((a, b) => a.localeCompare(b));

  return allSlugs.map((slug) => ({
    url: new URL(slug, siteUrl).toString(),
  }));
}
