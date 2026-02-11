#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Client, isFullBlock } from "@notionhq/client";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

loadLocalEnv();

const args = process.argv.slice(2);
const writeChanges = args.includes("--write");
const routeMapFile = args.find((arg) => !arg.startsWith("--")) ?? "content/route-map.json";
const slugFilter = getArgValue("--slug");
const maxPagesRaw = Number(getArgValue("--max-pages") ?? "0");
const maxPages = Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? Math.floor(maxPagesRaw) : 0;

const notionToken = requireEnv("NOTION_TOKEN");
const r2AccountId = requireEnv("R2_ACCOUNT_ID");
const r2Bucket = requireEnv("R2_BUCKET");
const r2AccessKeyId = requireEnv("R2_ACCESS_KEY_ID");
const r2SecretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
const r2PublicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
const r2ObjectPrefix = normalizePrefix(process.env.R2_OBJECT_PREFIX ?? "notion-images") || "notion-images";
const r2SkipExisting = parseBoolean(process.env.R2_SKIP_EXISTING, true);

const notion = new Client({ auth: notionToken });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

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
  uploadsCreated: 0,
  uploadsReused: 0,
  notionBlocksUpdated: 0,
  failed: 0,
};

console.log(`Mode: ${writeChanges ? "WRITE (Notion will be updated)" : "DRY-RUN (no Notion updates)"}`);
console.log(`Route map: ${routeMapPath}`);
console.log(`Routes selected: ${selectedRoutes.length}`);
console.log(`R2 bucket: ${r2Bucket}`);

for (let pageIndex = 0; pageIndex < selectedRoutes.length; pageIndex += 1) {
  const route = selectedRoutes[pageIndex];
  console.log(`\n[${pageIndex + 1}/${selectedRoutes.length}] ${route.slug} (${route.pageId})`);

  let blocks;
  try {
    blocks = await fetchAllBlocks(route.pageId);
  } catch (error) {
    stats.failed += 1;
    console.log(`  Failed to fetch blocks: ${String(error)}`);
    continue;
  }

  const imageBlocks = collectImageBlocks(blocks);
  stats.imageBlocksFound += imageBlocks.length;

  if (imageBlocks.length === 0) {
    console.log("  No image blocks found.");
    continue;
  }

  for (const imageBlock of imageBlocks) {
    const sourceUrl =
      imageBlock.image.type === "file" ? imageBlock.image.file.url : imageBlock.image.external.url;

    if (imageBlock.image.type !== "file") {
      continue;
    }

    if (!sourceUrl) {
      continue;
    }

    stats.imageBlocksEligible += 1;

    let migrated = migratedBySourceUrl.get(sourceUrl);
    if (!migrated) {
      try {
        migrated = await uploadImageFromNotion({
          sourceUrl,
          pageSlug: route.slug,
          blockId: imageBlock.id,
        });
        migratedBySourceUrl.set(sourceUrl, migrated);
      } catch (error) {
        stats.failed += 1;
        console.log(`  Upload failed for ${imageBlock.id}: ${String(error)}`);
        continue;
      }
    } else {
      stats.uploadsReused += 1;
    }

    if (!writeChanges) {
      console.log(`  DRY-RUN: ${imageBlock.id} -> ${migrated.publicUrl}`);
      continue;
    }

    try {
      await notion.blocks.update({
        block_id: imageBlock.id,
        image: {
          type: "external",
          external: { url: migrated.publicUrl },
        },
      });
      stats.notionBlocksUpdated += 1;
      console.log(`  Updated ${imageBlock.id}`);
      await sleep(220);
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
console.log(`- New uploads created: ${stats.uploadsCreated}`);
console.log(`- Uploads reused by URL: ${stats.uploadsReused}`);
console.log(`- Notion blocks updated: ${stats.notionBlocksUpdated}`);
console.log(`- Failures: ${stats.failed}`);

if (!writeChanges) {
  console.log("\nTo apply updates, rerun with --write");
}

async function uploadImageFromNotion({ sourceUrl, pageSlug, blockId }) {
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "aex-site-r2-image-migrator/1.0" },
  });

  if (!response.ok) {
    throw new Error(`download failed (${response.status} ${response.statusText})`);
  }

  const contentTypeHeader = response.headers.get("content-type") ?? "";
  const contentType = contentTypeHeader.split(";")[0] || "application/octet-stream";
  const extension = detectExtension(sourceUrl, contentType);
  const hash = crypto.createHash("sha1").update(sourceUrl).digest("hex").slice(0, 12);
  const key = `${r2ObjectPrefix}/${sanitizeSlug(pageSlug)}/${blockId.replace(/-/g, "")}-${hash}${extension}`;

  if (r2SkipExisting && (await objectExists(key))) {
    return { publicUrl: `${r2PublicBaseUrl}/${key}` };
  }

  const arrayBuffer = await response.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  await s3.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  stats.uploadsCreated += 1;
  console.log(`  Uploaded ${key} (${body.byteLength} bytes)`);
  return { publicUrl: `${r2PublicBaseUrl}/${key}` };
}

async function objectExists(key) {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: r2Bucket,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404) {
      return false;
    }
    if (error?.name === "NotFound" || error?.name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
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

function detectExtension(url, contentType) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (/^\.[a-z0-9]{2,8}$/.test(ext)) {
      return ext;
    }
  } catch {
    // ignore
  }

  const byContentType = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
    "image/heic": ".heic",
  };

  return byContentType[contentType] ?? ".bin";
}

function normalizePageId(raw) {
  const compact = raw.trim().replace(/-/g, "");
  if (compact.length !== 32) {
    return raw.trim();
  }

  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function sanitizeSlug(slug) {
  if (slug === "/") {
    return "home";
  }

  return slug
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "") || "page";
}

function normalizePrefix(value) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
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
      if (!key) {
        continue;
      }

      if (process.env[key] != null) {
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
