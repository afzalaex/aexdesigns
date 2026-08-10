import type { Metadata } from "next";
import { TypePlayground, type PlaygroundFont } from "@/components/TypePlayground";
import { getSiteUrl } from "@/lib/notion";

const playgroundFonts: PlaygroundFont[] = [
  {
    id: "typecheck",
    name: "TypeCheck",
    fontFamily: "TypeCheck",
    fontWoff2: "/fonts/TypeCheck.woff2",
    fontSizePx: 50,
    lineHeight: 1.12,
    textColor: "#fff",
    licenseLabel: "CC0",
    licenseHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    glyphCount: 80,
    releaseYear: 2023,
    seeMoreHref: "https://aex.design/typecheck",
  },
  {
    id: "nounty",
    name: "Nounty",
    fontFamily: "Nounty",
    fontWoff2: "/fonts/Nounty.woff2",
    fontSizePx: 50,
    lineHeight: 1.12,
    textColor: "#fff",
    licenseLabel: "CC0",
    licenseHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    glyphCount: 89,
    releaseYear: 2023,
    seeMoreHref: "https://aex.design/nounty",
  },
  {
    id: "aexpective",
    name: "AEXPECTIVE",
    fontFamily: "AEXPECTIVE",
    fontWoff2: "/fonts/AEXPECTIVE.woff2",
    fontSizePx: 50,
    lineHeight: 1.12,
    textColor: "#fff",
    licenseLabel: "CC0",
    licenseHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    glyphCount: 42,
    releaseYear: 2022,
    seeMoreHref: "https://aex.design/aexpective",
  },
  {
    id: "aextract",
    name: "Aextract",
    fontFamily: "Aextract",
    fontWoff2: "/fonts/Aextract.woff2",
    fontSizePx: 50,
    lineHeight: 1.12,
    textColor: "#fff",
    licenseLabel: "One",
    licenseHref: "https://aex.design/license-one",
    glyphCount: 98,
    releaseYear: 2022,
    seeMoreHref: "https://aex.design/aextract",
  },
  {
    id: "aextract36",
    name: "AEXTRACT36",
    fontFamily: "AEXTRACT36",
    fontWoff2: "/fonts/AEXTRACT36.woff2",
    fontSizePx: 50,
    lineHeight: 1.12,
    textColor: "#fff",
    licenseLabel: "CC0",
    licenseHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    glyphCount: 36,
    releaseYear: 2021,
    seeMoreHref: "https://aex.design/aextract36",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const url = new URL("/typeplayground", getSiteUrl()).toString();
  const description = "Explore the Type";

  return {
    title: "Type Playground",
    description,
    alternates: { canonical: url },
    openGraph: {
      title: "Type Playground",
      description,
      url,
      images: [
        {
          url: "/icon-512.png",
          width: 512,
          height: 512,
          alt: "Type Playground",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Type Playground",
      description,
      images: ["/icon-512.png"],
    },
  };
}

export default function TypePlaygroundPage() {
  return (
    <main id="page-typeplayground" className="site-content page__typeplayground">
      <section className="type-playground notion-root max-width">
        <h1 className="notion-heading notion-semantic-string type-playground__title">
          Explore the Type
        </h1>
        <TypePlayground fonts={playgroundFonts} />
      </section>
    </main>
  );
}
