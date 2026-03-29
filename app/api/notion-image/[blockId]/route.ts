import { Client, isFullBlock, isFullPage } from "@notionhq/client";

type Params = {
  blockId: string;
};

const thumbnailPropertyName =
  process.env.NOTION_THUMBNAIL_PROPERTY?.trim() || "Thumbnail";

function normalizeBlockId(raw: string): string {
  const trimmed = raw.trim();
  const compact = trimmed.replace(/-/g, "");

  if (!/^[a-f0-9]{32}$/i.test(compact)) {
    return trimmed;
  }

  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function getNotionClient(): Client {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) {
    throw new Error("NOTION_TOKEN is missing.");
  }
  return new Client({ auth: token });
}

function normalizeUpstreamImageUrl(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    const allowedHosts = [
      "secure.notion-static.com",
      "prod-files-secure.s3.us-west-2.amazonaws.com",
    ];

    if (
      allowedHosts.includes(hostname) ||
      hostname.endsWith(".notion-static.com")
    ) {
      return parsed.toString();
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchUpstreamImage(imageUrl: string): Promise<Response | null> {
  try {
    const upstream = await fetch(imageUrl, {
      headers: { "user-agent": "aex-site-notion-image-proxy/1.0" },
    });

    if (!upstream.ok || !upstream.body) {
      return null;
    }

    return upstream;
  } catch (error) {
    console.error("Failed to fetch Notion image file:", error);
    return null;
  }
}

function findProperty(
  properties: Record<string, any>,
  preferredName: string,
  fallbacks: string[]
): any {
  const names = [preferredName, ...fallbacks].filter(Boolean);

  for (const name of names) {
    if (name in properties) {
      return properties[name];
    }

    const foundKey = Object.keys(properties).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );

    if (foundKey) {
      return properties[foundKey];
    }
  }

  return undefined;
}

function getPropertyHostedImageUrl(property: any): string | null {
  if (!property) {
    return null;
  }

  if (property.type === "files") {
    const [firstFile] = Array.isArray(property.files) ? property.files : [];
    if (!firstFile) {
      return null;
    }

    if (firstFile.type === "file") {
      return normalizeUpstreamImageUrl(firstFile.file?.url ?? null);
    }

    if (firstFile.type === "external") {
      return normalizeUpstreamImageUrl(firstFile.external?.url ?? null);
    }
  }

  if (property.type === "url") {
    return normalizeUpstreamImageUrl(property.url ?? null);
  }

  return null;
}

function getFirstFilesPropertyHostedImageUrl(
  properties: Record<string, any>
): string | null {
  for (const value of Object.values(properties)) {
    if (value?.type !== "files") {
      continue;
    }

    const propertyUrl = getPropertyHostedImageUrl(value);
    if (propertyUrl) {
      return propertyUrl;
    }
  }

  return null;
}

function resolvePageHostedImageUrl(pageResponse: any): string | null {
  if (!isFullPage(pageResponse) || pageResponse.object !== "page") {
    return null;
  }

  const properties = pageResponse.properties as Record<string, any>;
  const thumbnailProperty = findProperty(
    properties,
    thumbnailPropertyName,
    ["thumbnail", "Thumbnail", "Card Thumbnail", "Preview", "Image"]
  );
  const propertyUrl = getPropertyHostedImageUrl(thumbnailProperty);

  if (propertyUrl) {
    return propertyUrl;
  }

  const firstFilesPropertyUrl = getFirstFilesPropertyHostedImageUrl(properties);
  if (firstFilesPropertyUrl) {
    return firstFilesPropertyUrl;
  }

  if (pageResponse.cover?.type === "file") {
    return normalizeUpstreamImageUrl(pageResponse.cover.file.url);
  }

  if (pageResponse.cover?.type === "external") {
    return normalizeUpstreamImageUrl(pageResponse.cover.external.url);
  }

  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<Params> }
) {
  const { blockId: rawBlockId } = await context.params;
  const blockId = normalizeBlockId(decodeURIComponent(rawBlockId));

  if (!blockId) {
    return new Response("Missing block id", { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const hintedSourceUrl = normalizeUpstreamImageUrl(
    requestUrl.searchParams.get("source")
  );

  let upstream = hintedSourceUrl
    ? await fetchUpstreamImage(hintedSourceUrl)
    : null;

  if (!upstream) {
    let imageUrl: string | null = null;

    try {
      const notion = getNotionClient();
      let blockLookupError: unknown;

      try {
        const blockResponse = await notion.blocks.retrieve({ block_id: blockId });

        if (
          isFullBlock(blockResponse) &&
          blockResponse.object === "block" &&
          blockResponse.type === "image" &&
          blockResponse.image.type === "file"
        ) {
          imageUrl = normalizeUpstreamImageUrl(blockResponse.image.file.url);
        }
      } catch (error) {
        blockLookupError = error;
      }

      if (!imageUrl) {
        try {
          const pageResponse = await notion.pages.retrieve({ page_id: blockId });
          imageUrl = resolvePageHostedImageUrl(pageResponse);
        } catch (error) {
          if (blockLookupError) {
            console.error("Failed to resolve Notion image block or page:", {
              blockId,
              blockLookupError,
              pageLookupError: error,
            });
          } else {
            console.error("Failed to resolve Notion image page:", {
              blockId,
              pageLookupError: error,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to create Notion image proxy client:", error);
      return new Response("Failed to resolve image source", { status: 502 });
    }

    if (!imageUrl) {
      return new Response("Failed to resolve image source", { status: 404 });
    }

    upstream = await fetchUpstreamImage(imageUrl);
  }

  if (!upstream) {
    return new Response("Image fetch failed", { status: 502 });
  }

  const headers = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  const upstreamLength = upstream.headers.get("content-length");

  if (upstreamType) {
    headers.set("Content-Type", upstreamType);
  }
  if (upstreamLength) {
    headers.set("Content-Length", upstreamLength);
  }

  headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
  );
  headers.set("X-Image-Proxy", "notion-block");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
