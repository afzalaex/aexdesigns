import { Client, isFullBlock } from "@notionhq/client";

type Params = {
  blockId: string;
};

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
    let imageUrl = "";

    try {
      const notion = getNotionClient();
      const blockResponse = await notion.blocks.retrieve({ block_id: blockId });

      if (
        !isFullBlock(blockResponse) ||
        blockResponse.object !== "block" ||
        blockResponse.type !== "image" ||
        blockResponse.image.type !== "file"
      ) {
        return new Response("Not a Notion hosted image block", { status: 404 });
      }

      imageUrl = blockResponse.image.file.url;
    } catch (error) {
      console.error("Failed to resolve Notion image block:", error);
      return new Response("Failed to resolve image source", { status: 502 });
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

  headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  headers.set("X-Image-Proxy", "notion-block");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
