import type { Metadata } from "next";
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
};

export async function generateStaticParams(): Promise<Params[]> {
  const entries = (Array.isArray(routeMap) ? routeMap : []) as RouteMapEntry[];
  const slugs = entries
    .map((entry) => (typeof entry.slug === "string" ? entry.slug.trim() : ""))
    .filter((slug) => slug.length > 0)
    .filter((slug) => slug !== "/")
    .filter((slug) => !/-type-tester$/i.test(slug));

  const uniqueSlugs = Array.from(new Set(slugs));

  return uniqueSlugs.map((slug) => ({
    slug: slug.replace(/^\//, "").split("/").filter(Boolean),
  }));
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
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: "article",
    },
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
