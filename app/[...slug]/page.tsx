import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import { getAllSlugs, getPageBySlug, getSiteUrl, slugFromSegments } from "@/lib/notion";

export const revalidate = 60;

type Params = {
  slug?: string[];
};

type PageProps = {
  params: Promise<Params>;
};

export async function generateStaticParams() {
  const slugs = await getAllSlugs();

  return slugs
    .filter((slug) => slug !== "/")
    .map((slug) => ({
      slug: slug.split("/").filter(Boolean),
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
