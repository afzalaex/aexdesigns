import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import routeMap from "@/content/route-map.json";
import {
  getAllSlugs,
  getPageBySlug,
  getSiteUrl,
  slugFromSegments,
} from "@/lib/notion";

export const revalidate = 3600;

type Params = {
  slug?: string[];
};

type PageProps = {
  params: Promise<Params>;
};

type RouteMapEntry = {
  slug?: string;
  pageId?: string;
};

const staticRouteSlugs = new Set(["/typeplayground"]);
const hiddenRouteSlugPattern = /-type-tester$/i;

function readRouteMapSlugs(): string[] {
  const entries = (Array.isArray(routeMap) ? routeMap : []) as RouteMapEntry[];

  return entries
    .filter(
      (entry) =>
        typeof entry.slug === "string" &&
        typeof entry.pageId === "string" &&
        entry.pageId.trim().length > 0
    )
    .map((entry) => entry.slug as string);
}

function toStaticParams(slugs: string[]): Params[] {
  const filteredSlugs = slugs
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0)
    .filter((slug) => slug !== "/")
    .filter((slug) => !staticRouteSlugs.has(slug))
    .filter((slug) => !hiddenRouteSlugPattern.test(slug));

  const uniqueSlugs = Array.from(new Set(filteredSlugs));

  return uniqueSlugs.map((slug) => ({
    slug: slug.replace(/^\//, "").split("/").filter(Boolean),
  }));
}

export async function generateStaticParams(): Promise<Params[]> {
  const hasDatabaseMode = Boolean(process.env.NOTION_DATABASE_ID?.trim());

  if (!hasDatabaseMode) {
    return toStaticParams(readRouteMapSlugs());
  }

  try {
    const slugs = await getAllSlugs();
    return toStaticParams(slugs);
  } catch (error) {
    console.error(
      "Failed to load slugs from Notion database for static params, falling back to route-map entries.",
      error
    );

    return toStaticParams(readRouteMapSlugs());
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = slugFromSegments(resolvedParams.slug);
  const page = await getPageBySlug(slug);

  if (!page) {
    return {};
  }

  const url = new URL(page.slug, getSiteUrl()).toString();

  return {
    title: page.title,
    alternates: { canonical: url },
  };
}

export default async function CatchAllPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = slugFromSegments(resolvedParams.slug);
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <SitePage page={page} />;
}
