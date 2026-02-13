import type { MetadataRoute } from "next";
import { getAllSlugs, getSiteUrl } from "@/lib/notion";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const slugs = await getAllSlugs();
  const staticSlugs = ["/typeplayground"];
  const allSlugs = Array.from(new Set([...slugs, ...staticSlugs]));

  return allSlugs.map((slug) => ({
    url: new URL(slug, siteUrl).toString(),
    changeFrequency: "weekly",
    priority: slug === "/" ? 1 : 0.7,
  }));
}
