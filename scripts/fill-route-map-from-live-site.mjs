#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const siteUrl = (process.argv[2] ?? "https://aex.design").replace(/\/$/, "");
const routeMapFile = process.argv[3] ?? "content/route-map.json";

const routeMapPath = path.resolve(process.cwd(), routeMapFile);
const raw = await fs.readFile(routeMapPath, "utf8");
const routes = JSON.parse(raw);

if (!Array.isArray(routes)) {
  throw new Error(`Expected an array in ${routeMapPath}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeId(id) {
  return id.replace(/-/g, "").toLowerCase();
}

function extractPageId(html, slug) {
  const articleMatch = html.match(/article id="block-([a-f0-9]{32})"/i);
  if (articleMatch) {
    return normalizeId(articleMatch[1]);
  }

  const escapedSlug = escapeRegExp(slug);
  const uriScopedMatch = html.match(
    new RegExp(
      `\\\\\"uri\\\\\":\\\\\"${escapedSlug}\\\\\"[\\\\s\\\\S]{0,5000}?\\\\\"blockId\\\\\":\\\\\"([a-f0-9-]{36})\\\\\"`,
      "i"
    )
  );
  if (uriScopedMatch) {
    return normalizeId(uriScopedMatch[1]);
  }

  const blockIdMatch =
    html.match(/\\"blockId\\":\\"([a-f0-9-]{36})\\"/i) ??
    html.match(/"blockId":"([a-f0-9-]{36})"/i);
  if (blockIdMatch) {
    return normalizeId(blockIdMatch[1]);
  }

  const notionRootMatch =
    html.match(/\\"notionPage\\":\\"([a-f0-9]{32})\\"/i) ??
    html.match(/"notionPage":"([a-f0-9]{32})"/i);
  if (notionRootMatch) {
    return normalizeId(notionRootMatch[1]);
  }

  return "";
}

const results = [];

for (const route of routes) {
  const slug = route?.slug;
  if (typeof slug !== "string" || !slug.startsWith("/")) {
    results.push({ slug: String(slug), status: "invalid", pageId: "" });
    continue;
  }

  const url = new URL(slug, `${siteUrl}/`).toString();

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "aex-site-route-map-filler/1.0" },
    });

    if (!response.ok) {
      results.push({
        slug,
        status: `http_${response.status}`,
        pageId: "",
      });
      continue;
    }

    const html = await response.text();
    const pageId = extractPageId(html, slug);

    if (!pageId) {
      results.push({ slug, status: "no_match", pageId: "" });
      continue;
    }

    route.pageId = pageId;
    results.push({ slug, status: "ok", pageId });
  } catch (error) {
    results.push({
      slug,
      status: "fetch_error",
      pageId: "",
      error: String(error),
    });
  }
}

await fs.writeFile(`${routeMapPath}`, `${JSON.stringify(routes, null, 2)}\n`, "utf8");

const ok = results.filter((item) => item.status === "ok");
const failed = results.filter((item) => item.status !== "ok");

console.log(`Filled ${ok.length}/${results.length} slugs in ${routeMapPath}`);
if (failed.length > 0) {
  console.log("Slugs needing manual pageId:");
  for (const item of failed) {
    console.log(`- ${item.slug} (${item.status})`);
  }
}
