import type { MetadataRoute } from "next";
import routeMap from "@/content/route-map.json";
import { getSiteUrl } from "@/lib/notion";

const routeMapSlugs = (Array.isArray(routeMap) ? routeMap : [])
  .map((entry: any) => (typeof entry?.slug === "string" ? entry.slug.trim() : ""))
  .filter((slug) => slug.length > 0);

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const staticSlugs = ["/typeplayground"];
  const allSlugs = Array.from(new Set([...routeMapSlugs, ...staticSlugs]));

  return allSlugs.map((slug) => ({
    url: new URL(slug, siteUrl).toString(),
    changeFrequency: "weekly",
    priority: slug === "/" ? 1 : 0.7,
  }));
}
