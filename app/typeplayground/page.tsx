import type { Metadata } from "next";
import { TypeTester } from "@/components/TypeTester";
import { getSiteUrl } from "@/lib/notion";

type PlaygroundFont = {
  id: string;
  name: string;
  fontFamily: string;
  fontWoff2: string;
  fontWoff?: string;
  fontSizePx: number;
  lineHeight: number;
  textColor: string;
  licenseLabel: string;
  licenseHref: string;
  glyphCount: number;
  releaseYear: number;
  seeMoreHref: string;
};

const playgroundFonts: PlaygroundFont[] = [
  {
    id: "typecheck",
    name: "TypeCheck",
    fontFamily: "TypeCheck",
    fontWoff2: "https://cdn.jsdelivr.net/gh/afzalaex/TypeCheck@main/TypeCheck.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/TypeCheck@main/TypeCheck.woff",
    fontSizePx: 60,
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
    fontWoff2: "https://cdn.jsdelivr.net/gh/afzalaex/Nounty@main/Nounty.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/Nounty@main/Nounty.woff",
    fontSizePx: 56,
    lineHeight: 1.1,
    textColor: "#fff",
    licenseLabel: "CC0",
    licenseHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    glyphCount: 89,
    releaseYear: 2023,
    seeMoreHref: "https://aex.design/nounty",
  },
  {
    id: "aextract",
    name: "Aextract",
    fontFamily: "Aextract",
    fontWoff2: "https://cdn.jsdelivr.net/gh/afzalaex/Aextract@main/Aextract-Regular.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/Aextract@main/Aextract-Regular.woff",
    fontSizePx: 60,
    lineHeight: 1.12,
    textColor: "#fff",
    licenseLabel: "One",
    licenseHref: "https://aex.design/license-one",
    glyphCount: 98,
    releaseYear: 2022,
    seeMoreHref: "https://aex.design/aextract",
  },
  {
    id: "aexpective",
    name: "AEXPECTIVE",
    fontFamily: "AEXPECTIVE",
    fontWoff2: "https://cdn.jsdelivr.net/gh/afzalaex/AEXPECTIVE@main/AEXPECTIVE.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/AEXPECTIVE@main/AEXPECTIVE.woff",
    fontSizePx: 42,
    lineHeight: 1.1,
    textColor: "#fff",
    licenseLabel: "CC0",
    licenseHref: "https://creativecommons.org/share-your-work/public-domain/cc0/",
    glyphCount: 42,
    releaseYear: 2022,
    seeMoreHref: "https://aex.design/aexpective",
  },
  {
    id: "aextract36",
    name: "AEXTRACT36",
    fontFamily: "AEXTRACT36",
    fontWoff2: "https://cdn.jsdelivr.net/gh/afzalaex/AEXTRACT36@main/AEXTRACT36.woff2",
    fontWoff: "https://cdn.jsdelivr.net/gh/afzalaex/AEXTRACT36@main/AEXTRACT36.woff",
    fontSizePx: 36,
    lineHeight: 1.1,
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

  return {
    title: "Type Playground",
    description: "Explore Aex fonts using interactive type testers.",
    alternates: { canonical: url },
    openGraph: {
      title: "Type Playground",
      description: "Explore Aex fonts using interactive type testers.",
      url,
      type: "website",
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
        {playgroundFonts.map((font) => (
          <article key={font.id} className="type-playground__font-section">
            <TypeTester
              id={`typeplayground-${font.id}`}
              fontFamily={font.fontFamily}
              fontWoff2={font.fontWoff2}
              fontWoff={font.fontWoff}
              defaultText="Type your own"
              fontSizePx={font.fontSizePx}
              lineHeight={font.lineHeight}
              textColor={font.textColor}
            />
            <div className="type-playground__font-info">
              <span className="type-playground__font-info-row">Font: {font.name}</span>
              <span className="type-playground__font-info-row">
                License:{" "}
                <a
                  className="type-playground__font-link"
                  href={font.licenseHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {font.licenseLabel}
                </a>
              </span>
              <span className="type-playground__font-info-row">
                Released: {font.releaseYear}
              </span>
              <span className="type-playground__font-info-row">
                Glyph Count: {font.glyphCount}
              </span>
              <a
                className="type-playground__font-link"
                href={font.seeMoreHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                See More
              </a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
