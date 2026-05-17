import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_START_ID = 733;
const DEFAULT_RECORD = {
  name: "",
  description: "",
};
const USAGE = `Usage:
  npm run sync:collection-2026
  npm run sync:collection-2026 -- --check
  npm run sync:collection-2026 -- --dry-run`;

function parseArgs(args) {
  const options = {
    check: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === "--check") {
      options.check = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    throw new Error(
      `Unexpected argument "${arg}". The script now chooses the next ID automatically.\n\n${USAGE}`
    );
  }

  return options;
}

function formatArtworkLocation(index) {
  return `artworks[${index}]`;
}

function formatIdList(ids) {
  if (ids.length <= 12) {
    return ids.join(", ");
  }

  return `${ids.slice(0, 12).join(", ")} and ${ids.length - 12} more`;
}

function createDefaultArtwork(id) {
  return {
    id,
    file: `${id}.js`,
    ...DEFAULT_RECORD,
  };
}

function normalizeArtwork(item, index) {
  const location = formatArtworkLocation(index);

  if (!item || typeof item !== "object") {
    throw new Error(`${location} must be an object.`);
  }

  const id = Number(item.id);
  if (!Number.isInteger(id) || id < DEFAULT_START_ID) {
    throw new Error(
      `${location}.id must be an integer greater than or equal to ${DEFAULT_START_ID}.`
    );
  }

  const file = typeof item.file === "string" ? item.file.trim() : "";
  const expectedFile = `${id}.js`;

  if (file.length === 0) {
    throw new Error(`${location}.file is required and should be "${expectedFile}".`);
  }

  if (file !== expectedFile) {
    throw new Error(
      `${location}.file is "${file}", but ID ${id} should use "${expectedFile}".`
    );
  }

  return {
    id,
    name: typeof item.name === "string" ? item.name : "",
    file,
    description: typeof item.description === "string" ? item.description : "",
  };
}

function normalizeCollection(artworks) {
  const byId = new Map();
  const duplicateIds = new Map();

  artworks.forEach((item, index) => {
    const normalized = normalizeArtwork(item, index);
    const existing = byId.get(normalized.id);

    if (existing) {
      duplicateIds.set(normalized.id, [existing.index, index]);
      return;
    }

    byId.set(normalized.id, {
      artwork: normalized,
      index,
    });
  });

  if (duplicateIds.size > 0) {
    const details = Array.from(duplicateIds.entries())
      .map(([id, indexes]) => `${id} at artworks[${indexes.join("] and artworks[")}]`)
      .join("; ");

    throw new Error(`Duplicate artwork IDs found: ${details}.`);
  }

  const ids = Array.from(byId.keys()).sort((a, b) => a - b);
  const minId = ids[0] ?? DEFAULT_START_ID;
  const maxId = ids.at(-1) ?? DEFAULT_START_ID - 1;

  if (minId !== DEFAULT_START_ID) {
    throw new Error(
      `Expected the first artwork ID to be ${DEFAULT_START_ID}, but found ${minId}.`
    );
  }

  const missingIds = [];
  for (let id = DEFAULT_START_ID; id <= maxId; id += 1) {
    if (!byId.has(id)) {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    throw new Error(
      `Missing artwork IDs between ${DEFAULT_START_ID} and ${maxId}: ${formatIdList(missingIds)}.`
    );
  }

  return {
    byId,
    maxId,
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
  const options = parseArgs(process.argv.slice(2));

  const raw = await readFile(collectionPath, "utf8");
  const parsed = JSON.parse(raw);
  const artworks = Array.isArray(parsed?.artworks) ? parsed.artworks : [];
  const { byId, maxId } = normalizeCollection(artworks);
  const nextId = maxId + 1;
  const latestArtwork = byId.get(maxId)?.artwork ?? null;

  if (
    !options.check &&
    latestArtwork &&
    latestArtwork.name.trim().length === 0
  ) {
    throw new Error(
      `Latest artwork ID ${maxId} still has an empty name. Fill that metadata before adding ID ${nextId}.`
    );
  }

  const nextArtworks = [];

  for (let id = DEFAULT_START_ID; id <= maxId; id += 1) {
    nextArtworks.push(byId.get(id).artwork);
  }

  if (!options.check) {
    nextArtworks.push(createDefaultArtwork(nextId));
  }

  nextArtworks.reverse();

  if (!options.check && !options.dryRun) {
    await writeFile(
      collectionPath,
      `${JSON.stringify({ artworks: nextArtworks }, null, 2)}\n`,
      "utf8"
    );
  }

  const relativeCollectionPath = path.relative(process.cwd(), collectionPath);

  if (options.check) {
    console.log(
      `Checked ${artworks.length} artworks in ${relativeCollectionPath}. IDs are unique and consecutive from ${DEFAULT_START_ID} through ${maxId}.`
    );
    return;
  }

  if (options.dryRun) {
    console.log(
      `Checked ${artworks.length} artworks in ${relativeCollectionPath}. Next run will add ID ${nextId} (${nextId}.js).`
    );
    return;
  }

  console.log(
    `Synced ${nextArtworks.length} artworks in ${relativeCollectionPath}. Added ID ${nextId} (${nextId}.js).`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
