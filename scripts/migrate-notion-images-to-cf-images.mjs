#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Client, isFullBlock } from "@notionhq/client";

loadLocalEnv();

const args = process.argv.slice(2);
const writeChanges = args.includes("--write");
const routeMapFile = args.find((arg) => !arg.startsWith("--")) ?? "content/route-map.json";
const slugFilter = getArgValue("--slug");
const maxPagesRaw = Number(getArgValue("--max-pages") ?? "0");
const maxPages = Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? Math.floor(maxPagesRaw) : 0;

const notionToken = requireEnv("NOTION_TOKEN");
const cfAccountId = requireEnv("CF_ACCOUNT_ID");
const cfApiToken = requireEnv("CF_API_TOKEN");
const cfImagesAccountHash = requireEnv("CF_IMAGES_ACCOUNT_HASH");
const cfImagesVariant = process.env.CF_IMAGES_VARIANT?.trim() || "public";
const cfImagesBase = (process.env.CF_IMAGES_BASE?.trim() || "https://imagedelivery.net").replace(
  /\/$/,
  ""
);
const skipExistingExternal = parseBoolean(process.env.CF_IMAGES_SKIP_EXTERNAL, true);

const notion = new Client({ auth: notionToken });

const routeMapPath = path.resolve(process.cwd(), routeMapFile);
const routeMapRaw = await fsp.readFile(routeMapPath, "utf8");
const routeEntries = JSON.parse(routeMapRaw);

if (!Array.isArray(routeEntries)) {
  throw new Error(`Expected array in ${routeMapPath}`);
}

const routes = routeEntries
  .filter(
    (entry) =>
      entry &&
      typeof entry.slug === "string" &&
      entry.slug.startsWith("/") &&
      typeof entry.pageId === "string" &&
      entry.pageId.trim().length > 0
  )
  .map((entry) => ({
    slug: entry.slug,
    pageId: normalizePageId(entry.pageId),
  }))
  .filter((entry) => (slugFilter ? entry.slug === slugFilter : true));

const selectedRoutes = maxPages > 0 ? routes.slice(0, maxPages) : routes;

if (selectedRoutes.length === 0) {
  console.log("No routes selected for migration.");
  process.exit(0);
}

const migratedBySourceUrl = new Map();
const stats = {
  pages: selectedRoutes.length,
  imageBlocksFound: 0,
  imageBlocksEligible: 0,
  uploaded: 0,
  reused: 0,
  updated: 0,
  skippedExternal: 0,
  failed: 0,
};

console.log(`Mode: ${writeChanges ? "WRITE (upload + update Notion)" : "DRY-RUN (no changes)"}`);
console.log(`Route map: ${routeMapPath}`);
console.log(`Routes selected: ${selectedRoutes.length}`);
console.log(`Delivery base: ${cfImagesBase}`);
console.log(`Delivery variant: ${cfImagesVariant}`);

for (let index = 0; index < selectedRoutes.length; index += 1) {
  const route = selectedRoutes[index];
  console.log(`\n[${index + 1}/${selectedRoutes.length}] ${route.slug} (${route.pageId})`);

  let blocks;
  try {
    blocks = await fetchAllBlocks(route.pageId);
  } catch (error) {
    stats.failed += 1;
    console.log(`  Failed to fetch page blocks: ${String(error)}`);
    continue;
  }

  const imageBlocks = collectImageBlocks(blocks);
  stats.imageBlocksFound += imageBlocks.length;

  if (imageBlocks.length === 0) {
    console.log("  No image blocks.");
    continue;
  }

  for (const imageBlock of imageBlocks) {
    const sourceUrl =
      imageBlock.image.type === "file" ? imageBlock.image.file.url : imageBlock.image.external.url;

    if (!sourceUrl) {
      continue;
    }

    if (imageBlock.image.type === "external" && skipExistingExternal) {
      stats.skippedExternal += 1;
      continue;
    }

    if (imageBlock.image.type !== "file") {
      continue;
    }

    stats.imageBlocksEligible += 1;

    if (!writeChanges) {
      console.log(`  DRY-RUN: ${imageBlock.id} -> upload + swap to Cloudflare Images`);
      continue;
    }

    let migrated = migratedBySourceUrl.get(sourceUrl);
    if (!migrated) {
      try {
        migrated = await migrateSingleImage(sourceUrl);
        migratedBySourceUrl.set(sourceUrl, migrated);
      } catch (error) {
        stats.failed += 1;
        console.log(`  Upload failed for ${imageBlock.id}: ${String(error)}`);
        continue;
      }
    } else {
      stats.reused += 1;
    }

    try {
      await notion.blocks.update({
        block_id: imageBlock.id,
        image: {
          type: "external",
          external: { url: migrated.deliveryUrl },
          caption: imageBlock.image.caption ?? [],
        },
      });

      stats.updated += 1;
      console.log(`  Updated ${imageBlock.id}`);
      await sleep(180);
    } catch (error) {
      stats.failed += 1;
      console.log(`  Failed to update ${imageBlock.id}: ${String(error)}`);
    }
  }
}

console.log("\nMigration summary");
console.log(`- Pages scanned: ${stats.pages}`);
console.log(`- Image blocks found: ${stats.imageBlocksFound}`);
console.log(`- Eligible Notion-file images: ${stats.imageBlocksEligible}`);
console.log(`- Uploaded to Cloudflare Images: ${stats.uploaded}`);
console.log(`- Reused uploads (duplicate source URL): ${stats.reused}`);
console.log(`- Notion blocks updated: ${stats.updated}`);
console.log(`- Skipped existing external images: ${stats.skippedExternal}`);
console.log(`- Failures: ${stats.failed}`);

if (!writeChanges) {
  console.log("\nRerun with --write to apply migration.");
}

async function migrateSingleImage(sourceUrl) {
  const sourceResponse = await fetch(sourceUrl, {
    headers: { "user-agent": "aex-site-cf-images-migrator/1.0" },
  });

  if (!sourceResponse.ok) {
    throw new Error(`download failed (${sourceResponse.status} ${sourceResponse.statusText})`);
  }

  const blob = await sourceResponse.blob();
  const form = new FormData();
  form.append("file", blob, "image");

  const uploadResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/images/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
      },
      body: form,
    }
  );

  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadJson?.success || !uploadJson?.result?.id) {
    const errorMessage =
      uploadJson?.errors?.map((item) => item?.message).filter(Boolean).join("; ") ||
      uploadResponse.statusText ||
      "unknown upload error";
    throw new Error(`cloudflare upload failed: ${errorMessage}`);
  }

  const imageId = uploadJson.result.id;
  const deliveryUrl = buildDeliveryUrl({
    base: cfImagesBase,
    accountHash: cfImagesAccountHash,
    imageId,
    variant: cfImagesVariant,
  });

  stats.uploaded += 1;
  console.log(`  Uploaded -> ${deliveryUrl}`);
  return { imageId, deliveryUrl };
}

async function fetchAllBlocks(blockId) {
  const blocks = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if (!isFullBlock(result) || result.object !== "block") {
        continue;
      }

      const block = { ...result };
      if (result.has_children) {
        block.children = await fetchAllBlocks(result.id);
      }
      blocks.push(block);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

function collectImageBlocks(blocks, out = []) {
  for (const block of blocks) {
    if (block.type === "image") {
      out.push(block);
    }
    if (Array.isArray(block.children) && block.children.length > 0) {
      collectImageBlocks(block.children, out);
    }
  }
  return out;
}

function buildDeliveryUrl({ base, accountHash, imageId, variant }) {
  const normalizedBase = base.replace(/\/$/, "");
  const parsed = new URL(normalizedBase);

  const cleanedVariant = variant.replace(/^\/+/, "");
  const cleanedHash = accountHash.replace(/^\/+|\/+$/g, "");
  const cleanedImageId = imageId.replace(/^\/+|\/+$/g, "");

  if (parsed.hostname === "imagedelivery.net") {
    return `${normalizedBase}/${cleanedHash}/${cleanedImageId}/${cleanedVariant}`;
  }

  if (parsed.pathname.includes("/cdn-cgi/imagedelivery")) {
    return `${normalizedBase}/${cleanedHash}/${cleanedImageId}/${cleanedVariant}`;
  }

  return `${normalizedBase}/cdn-cgi/imagedelivery/${cleanedHash}/${cleanedImageId}/${cleanedVariant}`;
}

function normalizePageId(raw) {
  const compact = raw.trim().replace(/-/g, "");
  if (compact.length !== 32) {
    return raw.trim();
  }

  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const item = args.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : undefined;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];

  for (const fileName of envFiles) {
    const fullPath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const lineWithoutExport = line.startsWith("export ")
        ? line.slice("export ".length).trim()
        : line;
      const eqIndex = lineWithoutExport.indexOf("=");
      if (eqIndex <= 0) {
        continue;
      }

      const key = lineWithoutExport.slice(0, eqIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }

      let value = lineWithoutExport.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
