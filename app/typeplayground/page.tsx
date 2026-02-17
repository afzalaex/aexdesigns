import type { Metadata } from "next";
import { TypePlayground, type PlaygroundFont } from "@/components/TypePlayground";
import { getSiteUrl } from "@/lib/notion";

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

const footerLinks = [
  { label: "Newsletter", href: "http://letter.aex.design/" },
  { label: "\u{1D54F}", href: "https://x.com/aexdesigns" },
  { label: "Instagram", href: "http://instagram.com/aex_designs" },
];

export async function generateMetadata(): Promise<Metadata> {
  const url = new URL("/typeplayground", getSiteUrl()).toString();

  return {
    title: "Type Playground",
    alternates: { canonical: url },
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
        <p className="notion-text notion-text__content notion-semantic-string type-playground__footer-links">
          {footerLinks.map((link, index) => (
            <span key={link.href}>
              {index > 0 ? " | " : null}
              <a
                className="notion-link link"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            </span>
          ))}
        </p>
      </section>
    </main>
  );
}
