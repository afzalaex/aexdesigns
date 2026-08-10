import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/notion";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Private revalidation endpoint
        "/api/notion-revalidate",
        // Next.js internal static files (JS chunks, CSS, fonts in /media/, etc.)
        "/_next/static/",
      ],
    },
    // Canonical sitemap includes /ta (Tools/Assets), not legacy /assets
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl,
  };
}
