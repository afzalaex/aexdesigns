import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/notion";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/notion-revalidate"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
