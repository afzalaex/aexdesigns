import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/notion";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/notion-revalidate",  // private revalidation endpoint
        "/_next/static/",          // Next.js internal static files (JS chunks, CSS, fonts in /media/, etc.)
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
