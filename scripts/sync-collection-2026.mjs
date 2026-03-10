import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_START_ID = 733;
const DEFAULT_END_ID = 781;
const DEFAULT_RECORD = {
  name: "",
  description: "",
};

function parseEndId(rawValue) {
  if (!rawValue) {
    return DEFAULT_END_ID;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < DEFAULT_START_ID) {
    throw new Error(
      `Expected an integer end ID greater than or equal to ${DEFAULT_START_ID}.`
    );
  }

  return value;
}

function normalizeArtwork(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const id = Number(item.id);
  if (!Number.isInteger(id) || id < DEFAULT_START_ID) {
    return null;
  }

  return {
    id,
    name: typeof item.name === "string" ? item.name : "",
    file:
      typeof item.file === "string" && item.file.trim().length > 0
        ? item.file.trim()
        : `${id}.js`,
    description: typeof item.description === "string" ? item.description : "",
  };
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const collectionPath = path.join(
    __dirname,
    "..",
    "public",
    "data",
    "collection-2026.json"
  );
  const endId = parseEndId(process.argv[2]);

  const raw = await readFile(collectionPath, "utf8");
  const parsed = JSON.parse(raw);
  const artworks = Array.isArray(parsed?.artworks) ? parsed.artworks : [];
  const existingById = new Map();

  for (const item of artworks) {
    const normalized = normalizeArtwork(item);
    if (normalized) {
      existingById.set(normalized.id, normalized);
    }
  }

  const nextArtworks = [];
  let addedCount = 0;

  for (let id = DEFAULT_START_ID; id <= endId; id += 1) {
    const existing = existingById.get(id);

    if (existing) {
      nextArtworks.push(existing);
      continue;
    }

    addedCount += 1;
    nextArtworks.push({
      id,
      file: `${id}.js`,
      ...DEFAULT_RECORD,
    });
  }

  await writeFile(
    collectionPath,
    `${JSON.stringify({ artworks: nextArtworks }, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Synced ${nextArtworks.length} artworks in ${path.relative(process.cwd(), collectionPath)}. Added ${addedCount} new entr${addedCount === 1 ? "y" : "ies"}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
