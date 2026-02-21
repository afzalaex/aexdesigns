#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const sitemapUrl = process.argv[2] ?? "https://aex.design/sitemap.xml";
const outputFile = process.argv[3] ?? "content/route-map.json";
const hiddenSlugPattern = /-type-tester$/i;
const excludedStaticSlugs = new Set(["/typeplayground"]);

function normalizeSlug(raw) {
  const withoutDomain = String(raw).trim().replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutDomain.split(/[?#]/)[0] ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const cleaned = withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");
  return cleaned || "/";
}

const outputPath = path.resolve(process.cwd(), outputFile);
let existingRoutes = [];

try {
  const existingRaw = await fs.readFile(outputPath, "utf8");
  const parsed = JSON.parse(existingRaw);
  if (Array.isArray(parsed)) {
    existingRoutes = parsed;
  }
} catch {
  existingRoutes = [];
}

const response = await fetch(sitemapUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
}

const xml = await response.text();
const urlMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const slugs = Array.from(
  new Set(
    urlMatches.map((url) => {
      const pathname = new URL(url).pathname;
      return normalizeSlug(pathname === "" ? "/" : pathname);
    })
  )
)
  .filter((slug) => !excludedStaticSlugs.has(slug))
  .sort((a, b) => a.localeCompare(b));

if (!slugs.includes("/")) {
  slugs.unshift("/");
}

const existingBySlug = new Map();

for (const route of existingRoutes) {
  const slug = typeof route?.slug === "string" ? normalizeSlug(route.slug) : "";
  if (!slug) {
    continue;
  }

  const pageId = typeof route?.pageId === "string" ? route.pageId.trim() : "";
  existingBySlug.set(slug, pageId);
}

const mappedBySlug = new Map(
  slugs.map((slug) => [
    slug,
    {
      slug,
      pageId: existingBySlug.get(slug) ?? "",
    },
  ])
);

for (const [slug, pageId] of existingBySlug.entries()) {
  if (mappedBySlug.has(slug) || !hiddenSlugPattern.test(slug)) {
    continue;
  }

  mappedBySlug.set(slug, {
    slug,
    pageId,
  });
}

const mapped = Array.from(mappedBySlug.values()).sort((a, b) =>
  a.slug.localeCompare(b.slug)
);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(mapped, null, 2)}\n`, "utf8");

console.log(`Wrote ${mapped.length} routes to ${outputPath}`);
