import type { Metadata } from "next";
import routeMap from "@/content/route-map.json";
import { getSiteUrl } from "@/lib/notion";
import { HomepageLayout, type HomepageLinks } from "@/components/HomepageLayout";

export const revalidate = 3600;

const internalLinkCandidates = {
  designArt: ["/da", "/design-art", "/designart", "/onchain"],
  digitalAssets: ["/dda", "/digital-design-assets", "/digitaldesignassets"],
  archive: ["/archive"],
} as const;

const externalLinkFallbacks = {
  newsletter: "https://letter.aex.design/",
  x: "https://x.com/aexdesigns",
  ig: "https://instagram.com/aex_designs",
  gh: "https://github.com/afzalaex",
} as const;

type InternalHomepageLinkKey = keyof typeof internalLinkCandidates;
const routeSlugs = new Set(
  (Array.isArray(routeMap) ? routeMap : [])
    .map((entry: any) => (typeof entry?.slug === "string" ? entry.slug.trim() : ""))
    .filter((slug) => slug.length > 0)
);

function resolveInternalLink(key: InternalHomepageLinkKey): string {
  const candidates = internalLinkCandidates[key];

  for (const candidate of candidates) {
    if (routeSlugs.has(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const homepageLinks: HomepageLinks = {
  designArt: resolveInternalLink("designArt"),
  digitalAssets: resolveInternalLink("digitalAssets"),
  archive: resolveInternalLink("archive"),
  newsletter: externalLinkFallbacks.newsletter,
  x: externalLinkFallbacks.x,
  ig: externalLinkFallbacks.ig,
  gh: externalLinkFallbacks.gh,
};

export function generateMetadata(): Metadata {
  const url = new URL("/", getSiteUrl()).toString();

  return {
    alternates: { canonical: url },
  };
}

export default function HomePage() {
  return (
    <>
      <div className="site-top-actions">
        <div className="site-top-actions__meta">
          <span className="site-top-stat">Aex Designs</span>
          <span className="site-top-actions__release">Since 2019</span>
        </div>
      </div>
      <HomepageLayout links={homepageLinks} />
    </>
  );
}
