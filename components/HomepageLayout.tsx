import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import styles from "./HomepageLayout.module.css";

export type HomepageLinks = {
  onchain: string;
  offchain: string;
  digitalAssets: string;
  newsletter: string;
  archive: string;
  x: string;
  ig: string;
  gh: string;
};

const BOARD_SIZE = 1000;
const WORKS_GROUP_WIDTH = 475;
const WORKS_GROUP_HEIGHT = 370;
const WORDS_GROUP_WIDTH = 475;
const WORDS_GROUP_HEIGHT = 370;

function toPercent(value: number, base = BOARD_SIZE): string {
  return `${(value / base) * 100}%`;
}

function boardStyle(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: toPercent(x),
    top: toPercent(y),
    width: toPercent(width),
    height: toPercent(height),
  };
}

function localStyle(
  x: number,
  y: number,
  width: number,
  height: number,
  baseWidth: number,
  baseHeight: number
): CSSProperties {
  return {
    left: toPercent(x, baseWidth),
    top: toPercent(y, baseHeight),
    width: toPercent(width, baseWidth),
    height: toPercent(height, baseHeight),
  };
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

type CellProps = {
  label?: ReactNode;
  href?: string;
  style: CSSProperties;
  className?: string;
  labelClassName?: string;
  ariaLabel?: string;
};

function Cell({
  label,
  href,
  style,
  className,
  labelClassName,
  ariaLabel,
}: CellProps) {
  const blockClassName = [styles.block, className, href ? styles.interactive : ""]
    .filter(Boolean)
    .join(" ");

  const content = label ? (
    <span className={[styles.blockLabel, labelClassName].filter(Boolean).join(" ")}>
      {label}
    </span>
  ) : null;

  if (!href) {
    return (
      <div className={blockClassName} style={style} aria-hidden={!label}>
        {content}
      </div>
    );
  }

  if (isExternalHref(href)) {
    return (
      <a
        className={blockClassName}
        style={style}
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      className={blockClassName}
      style={style}
      href={href}
      prefetch={false}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
    >
      {content}
    </Link>
  );
}

export function HomepageLayout({ links }: { links: HomepageLinks }) {
  return (
    <main id="page-index" className={`site-content page__index ${styles.homeMain}`}>
      <section className={styles.homeWrap}>
        <div className={styles.kicker}>
          <h1 className="notion-heading">Intangible internet things.</h1>
        </div>

        <div className={styles.board}>
          <div className={styles.group} style={boardStyle(110, 110, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}>
            <Cell
              className={`${styles.groupMember} ${styles.groupTitle} ${styles.titleCell}`}
              labelClassName={styles.titleLabel}
              label="WORKS"
              style={localStyle(0, 0, 475, 180, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}
            />
            <Cell
              className={`${styles.groupMember} ${styles.groupChild}`}
              label="Onchain"
              href={links.onchain}
              style={localStyle(0, 190, 152, 180, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}
            />
            <Cell
              className={`${styles.groupMember} ${styles.groupChild}`}
              label="Offchain"
              href={links.offchain}
              style={localStyle(162, 190, 151, 180, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}
            />
            <Cell
              className={`${styles.groupMember} ${styles.groupChild}`}
              label={
                <span className={styles.multiline}>
                  <span>Digital</span>
                  <span>Design</span>
                  <span>Assets</span>
                </span>
              }
              ariaLabel="Digital Design Assets"
              href={links.digitalAssets}
              style={localStyle(323, 190, 152, 180, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}
            />
          </div>

          <div className={styles.group} style={boardStyle(433, 490, WORDS_GROUP_WIDTH, WORDS_GROUP_HEIGHT)}>
            <Cell
              className={`${styles.groupMember} ${styles.groupTitle} ${styles.titleCell}`}
              labelClassName={styles.titleLabel}
              label="WORDS"
              style={localStyle(0, 0, 475, 180, WORDS_GROUP_WIDTH, WORDS_GROUP_HEIGHT)}
            />
            <Cell
              className={`${styles.groupMember} ${styles.groupChild}`}
              label="Newsletter"
              href={links.newsletter}
              style={localStyle(0, 190, 232.5, 180, WORDS_GROUP_WIDTH, WORDS_GROUP_HEIGHT)}
            />
            <Cell
              className={`${styles.groupMember} ${styles.groupChild}`}
              label="Archive"
              href={links.archive}
              style={localStyle(242.5, 190, 232.5, 180, WORDS_GROUP_WIDTH, WORDS_GROUP_HEIGHT)}
            />
          </div>

          <Cell className={styles.empty} style={boardStyle(754.7, 110, 153.3, 180)} />
          <Cell className={styles.empty} style={boardStyle(110, 490, 116.2, 180)} />
          <Cell className={styles.empty} style={boardStyle(236.2, 490, 186.8, 180)} />

          <svg
            className={styles.svgBlock}
            style={boardStyle(236.2, 680, 186.8, 180)}
            viewBox="0 0 186.8 180"
            aria-hidden="true"
          >
            <polygon
              className={styles.svgPolygon}
              points="0,0 0,85 126.3,85 126.3,180 186.8,180 186.8,0"
            />
          </svg>
          <svg
            className={styles.svgBlock}
            style={boardStyle(595, 110, 313, 370)}
            viewBox="0 0 313 370"
            aria-hidden="true"
          >
            <polygon
              className={styles.svgPolygon}
              points="0,0 149.7,0 149.7,190 313,190 313,370 0,370"
            />
          </svg>

          <Cell label="X" href={links.x} style={boardStyle(110, 680, 116.2, 85)} />
          <Cell label="IG" href={links.ig} style={boardStyle(110, 775, 116.2, 85)} />
          <Cell label="GH" href={links.gh} style={boardStyle(236.2, 775, 116.2, 85)} />
        </div>
      </section>
    </main>
  );
}
