import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/SitePage";
import { getPageBySlug, getSiteUrl } from "@/lib/notion";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("/");

  if (!page) {
    return {};
  }

  const url = new URL("/", getSiteUrl()).toString();

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: "website",
    },
  };
}

export default async function HomePage() {
  const page = await getPageBySlug("/");

  if (!page) {
    notFound();
  }

  return <SitePage page={page} />;
}
