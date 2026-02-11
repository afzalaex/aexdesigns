#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const sitemapUrl = process.argv[2] ?? "https://aex.design/sitemap.xml";
const outputFile = process.argv[3] ?? "content/route-map.json";

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
      return pathname === "" ? "/" : pathname;
    })
  )
).sort((a, b) => a.localeCompare(b));

if (!slugs.includes("/")) {
  slugs.unshift("/");
}

const mapped = slugs.map((slug) => ({ slug, pageId: "" }));
const outputPath = path.resolve(process.cwd(), outputFile);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(mapped, null, 2)}\n`, "utf8");

console.log(`Wrote ${mapped.length} routes to ${outputPath}`);
