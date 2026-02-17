"use client";

import { useMemo, useState } from "react";
import { TypeTester } from "@/components/TypeTester";

export type PlaygroundFont = {
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

type TypePlaygroundProps = {
  fonts: PlaygroundFont[];
};

export function TypePlayground({ fonts }: TypePlaygroundProps) {
  const [activeFontId, setActiveFontId] = useState<string>(fonts[0]?.id ?? "");
  const activeFont = useMemo(
    () => fonts.find((font) => font.id === activeFontId) ?? fonts[0],
    [activeFontId, fonts],
  );

  if (!activeFont) {
    return null;
  }

  return (
    <>
      <div className="type-playground__toggle" aria-label="Choose a font">
        {fonts.map((font) => {
          const isActive = font.id === activeFont.id;

          return (
            <button
              key={font.id}
              type="button"
              aria-pressed={isActive}
              className={`type-playground__toggle-button${isActive ? " is-active" : ""}`}
              onClick={() => setActiveFontId(font.id)}
            >
              {font.name}
            </button>
          );
        })}
      </div>

      <article className="type-playground__font-section">
        <TypeTester
          id="typeplayground-tester"
          fontFamily={activeFont.fontFamily}
          fontWoff2={activeFont.fontWoff2}
          fontWoff={activeFont.fontWoff}
          defaultText="Type your own"
          fontSizePx={activeFont.fontSizePx}
          lineHeight={activeFont.lineHeight}
          textColor={activeFont.textColor}
        />
        <div className="type-playground__font-info">
          <span className="type-playground__font-info-row">Font: {activeFont.name}</span>
          <span className="type-playground__font-info-row">
            License:{" "}
            <a
              className="type-playground__font-link"
              href={activeFont.licenseHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {activeFont.licenseLabel}
            </a>
          </span>
          <span className="type-playground__font-info-row">
            Released: {activeFont.releaseYear}
          </span>
          <span className="type-playground__font-info-row">
            Glyph Count: {activeFont.glyphCount}
          </span>
          <a
            className="type-playground__font-link"
            href={activeFont.seeMoreHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            See More
          </a>
        </div>
      </article>
    </>
  );
}
