import type { NotionBlock } from "@/lib/notion";

function buildNotionImageProxyUrl(
  blockId: string,
  sourceUrl?: string | null
): string {
  const proxyPath = `/api/notion-image/${encodeURIComponent(blockId)}`;
  if (!sourceUrl) {
    return proxyPath;
  }

  const searchParams = new URLSearchParams({ source: sourceUrl });
  return `${proxyPath}?${searchParams.toString()}`;
}

export function resolveNotionImagePrimarySrc(block: NotionBlock): string | null {
  if (block.type !== "image") {
    return null;
  }

  if (block.image.type === "external") {
    return block.image.external.url;
  }

  return buildNotionImageProxyUrl(block.id, block.image.file.url);
}

export function resolveNotionImageFallbackSrc(
  block: NotionBlock
): string | undefined {
  if (block.type !== "image" || block.image.type === "external") {
    return undefined;
  }

  return buildNotionImageProxyUrl(block.id);
}
