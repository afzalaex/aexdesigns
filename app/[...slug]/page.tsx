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
  let pageTitle = page.title;
  let pageDescription = page.description?.trim() || "Intangible internet things by Afzal";

  if (slug === "/assets") {
    pageTitle = "Assets";
    pageDescription = "Digital assets for the internet";
  }

  if (slug === "/da") {
    pageTitle = "Design/Art";
    pageDescription = "Explore my design and art related projects";
  }

  if (slug === "/archive") {
    pageTitle = "Archive";
    pageDescription = "Writings on design/art, internet, philosophy & more";
  }

  if (slug === "/about") {
    pageTitle = "About";
    pageDescription = "I'm Afzal, an internet artist/designer/craftsman. Aex Designs is my digital playground/archive/canvas, where I share experiments, wip, releases, writings, and more.";
  }

  if (slug === "/every-days") {
    pageTitle = "e/very days";
    pageDescription = "A daily art practice. Primarily generative art rooted in abstraction. The name is an ode to e/acc.";
  }

  if (slug === "/pixcapes") {
    pageTitle = "Pixcapes";
    pageDescription = "Scapes from the pixel world, generated via p5js.";
  }

  if (slug === "/emopepen") {
    pageTitle = "Emopepen";
    pageDescription = "Opepen X Emoji remix";
  }

  if (slug === "/remix") {
    pageTitle = "Derivatives/Remixes";
    pageDescription = "Artworks that are derived/remixed from other artworks";
  }

  if (slug === "/aexthetics") {
    pageTitle = "Aexthetics";
    pageDescription = "“Philosophical” art";
  }

  if (slug === "/cc") {
    pageTitle = "Commission/Collab Works";
    pageDescription = "Commissions & collaborations archive";
  }

  if (slug === "/p5nels") {
    pageTitle = "P5NELS";
    pageDescription = "50 free abstract mobile wallpapers";
  }

  if (slug === "/typecheck") {
    pageTitle = "TypeCheck";
    pageDescription = "A font NFT derivative of the Checks art";
  }

  if (slug === "/dsp2") {
    pageTitle = "Design Asset Pack #2";
    pageDescription = "20 abstract kinetic patterns";
  }

  if (slug === "/nounty") {
    pageTitle = "Nounty";
    pageDescription = "First ever ready to use Nounish themed font";
  }

  if (slug === "/aexpective") {
    pageTitle = "AEXPECTIVE";
    pageDescription = "Geometric font with some perspective";
  }

  if (slug === "/aextract") {
    pageTitle = "Aextract";
    pageDescription = "A bold, geometric and modular font";
  }

  if (slug === "/aextract36") {
    pageTitle = "AEXTRACT 36";
    pageDescription = "Free modular geometric font";
  }

  if (slug === "/dsp1") {
    pageTitle = "Design Asset Pack #1";
    pageDescription = "20 free abstract marks for your next creative project";
  }

  if (slug === "/typeplayground") {
    pageTitle = "Type Playground";
    pageDescription = "Explore the Type";
  }

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url,
      images: [
        {
          url: "/icon-512.png",
          width: 512,
          height: 512,
          alt: pageTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: ["/icon-512.png"],
    },
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
