import type { MetadataRoute } from "next";
import { getAllSlugs, getSiteUrl } from "@/lib/notion";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const slugs = await getAllSlugs();

  return slugs.map((slug) => ({
    url: new URL(slug, siteUrl).toString(),
    changeFrequency: "weekly",
    priority: slug === "/" ? 1 : 0.7,
  }));
}
