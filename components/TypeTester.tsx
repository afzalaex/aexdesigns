"use client";

import { useEffect, useRef, useState } from "react";

type TypeTesterProps = {
  id: string;
  fontFamily: string;
  fontWoff2: string;
  fontWoff?: string;
  defaultText?: string;
  fontSizePx?: number;
  lineHeight?: number;
  textColor?: string;
};

function escapeFontFamily(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function TypeTester({
  id,
  fontFamily,
  fontWoff2,
  fontWoff,
  defaultText = "Type Your Own",
  fontSizePx = 60,
  lineHeight = 1.12,
  textColor = "#fff",
}: TypeTesterProps) {
  const localFontFamily = `${escapeFontFamily(fontFamily)}-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const [currentFontSize, setCurrentFontSize] = useState<number>(fontSizePx);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const minFontSize = 10;
  const maxFontSize = 100;

  useEffect(() => {
    if (inputRef.current && inputRef.current.textContent === "") {
      inputRef.current.textContent = defaultText;
    }
  }, [defaultText]);

  return (
    <section
      className="aex-type-tester"
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;

        if (
          target.closest(".aex-type-tester__controls") ||
          target.closest(".aex-type-tester__input")
        ) {
          return;
        }

        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <style>{`
        @font-face {
          font-family: '${localFontFamily}';
          src:
            url('${fontWoff2}') format('woff2')
            ${fontWoff ? `, url('${fontWoff}') format('woff')` : ""};
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
      <div className="aex-type-tester__controls">
        <label htmlFor={`aex-size-${id}`} className="aex-type-tester__label">
          Size
        </label>
        <input
          id={`aex-size-${id}`}
          className="aex-type-tester__range"
          type="range"
          min={minFontSize}
          max={maxFontSize}
          step={1}
          value={currentFontSize}
          onChange={(event) => setCurrentFontSize(Number(event.target.value))}
        />
        <span className="aex-type-tester__value">{currentFontSize}px</span>
      </div>
      <div
        ref={inputRef}
        className={`aex-type-tester__input${isFocused ? " is-active" : ""}`}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-label="Type tester input"
        data-placeholder={defaultText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          fontFamily: `'${localFontFamily}', 'Space Mono', monospace`,
          fontSize: `${currentFontSize}px`,
          lineHeight,
          color: textColor,
          opacity: isFocused ? 1 : 0.72,
        }}
      />
      <div className="aex-type-tester__footer">TypeTester</div>
    </section>
  );
}
