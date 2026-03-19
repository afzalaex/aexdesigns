import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import { getPageBySlug, getSiteUrl, slugFromSegments } from "@/lib/notion";

export const revalidate = 3600;

type Params = {
  slug?: string[];
};

type PageProps = {
  params: Promise<Params>;
};

const getCachedPage = cache(async (slug: string) => getPageBySlug(slug));

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
