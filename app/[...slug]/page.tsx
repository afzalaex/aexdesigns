import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import routeMap from "@/content/route-map.json";
import { getPageBySlug, getSiteUrl, slugFromSegments } from "@/lib/notion";

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

const getCachedPage = cache(async (slug: string) => getPageBySlug(slug));

export function generateStaticParams(): Params[] {
  return toStaticParams(readRouteMapSlugs());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = slugFromSegments(resolvedParams.slug);
  const page = await getCachedPage(slug);

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
  const page = await getCachedPage(slug);

  if (!page) {
    notFound();
  }

  return <SitePage page={page} />;
}
