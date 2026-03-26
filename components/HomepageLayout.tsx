import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { HomepageCollabForm } from "./HomepageCollabForm";
import styles from "./HomepageLayout.module.css";

export type HomepageLinks = {
  designArt: string;
  digitalAssets: string;
  newsletter: string;
  archive: string;
  x: string;
  ig: string;
  gh: string;
};

const BOARD_SIZE = 1000;
const BOARD_CONTENT_X_OFFSET = -9;
const BOARD_CONTENT_MIN_X = 101;
const BOARD_CONTENT_MIN_Y = 110;
const BOARD_CONTENT_WIDTH = 798;
const BOARD_CONTENT_HEIGHT = 750;
const WORKS_GROUP_WIDTH = 475;
const WORKS_GROUP_HEIGHT = 370;
const WORDS_GROUP_WIDTH = 475;
const WORDS_GROUP_HEIGHT = 370;
const BUILDER_X_HREF = "https://x.com/afzalaex";

function toPercent(value: number, base = BOARD_SIZE): string {
  return `${(value / base) * 100}%`;
}

function boardStyle(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: toPercent(x + BOARD_CONTENT_X_OFFSET - BOARD_CONTENT_MIN_X, BOARD_CONTENT_WIDTH),
    top: toPercent(y - BOARD_CONTENT_MIN_Y, BOARD_CONTENT_HEIGHT),
    width: toPercent(width, BOARD_CONTENT_WIDTH),
    height: toPercent(height, BOARD_CONTENT_HEIGHT),
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
        <div className={styles.heroStack}>
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
                label="Design/Art"
                href={links.designArt}
                style={localStyle(0, 190, 232.5, 180, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}
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
                style={localStyle(242.5, 190, 232.5, 180, WORKS_GROUP_WIDTH, WORKS_GROUP_HEIGHT)}
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

            <Cell
              className={styles.builderBlock}
              label={
                <span className={styles.builderLabel}>
                  <span>Built</span>
                  <span>by</span>
                  <span>Afzal</span>
                </span>
              }
              href={BUILDER_X_HREF}
              ariaLabel="Built by Afzal on X"
              style={boardStyle(754.7, 110, 153.3, 180)}
            />
            <Cell className={styles.empty} style={boardStyle(110, 490, 313, 180)} />

            <Cell className={styles.empty} style={boardStyle(236.2, 680, 116.2, 180)} />
            <Cell className={styles.empty} style={boardStyle(362.4, 680, 60.6, 180)} />

            <Cell className={styles.empty} style={boardStyle(595, 110, 149.7, 370)} />
            <HomepageCollabForm
              ariaLabel="Work with Me"
              className={`${styles.block} ${styles.blockButton} ${styles.interactive} ${styles.builderBlock}`}
              dialogTitle="LET ME HELP YOU BRING YOUR IDEAS TO LIFE"
              style={boardStyle(754.7, 300, 153.3, 180)}
            >
              <span className={`${styles.blockLabel} ${styles.builderLabel}`}>
                <span>Work</span>
                <span>with</span>
                <span>Me</span>
              </span>
            </HomepageCollabForm>

            <Cell label="X" href={links.x} style={boardStyle(110, 680, 116.2, 85)} />
            <Cell label="IG" href={links.ig} style={boardStyle(110, 775, 116.2, 85)} />
          </div>

          <h1 className={styles.heroTitle}>Intangible internet things</h1>
          <section className={styles.about}>
            <p className={`${styles.aboutText} notion-semantic-string`}>
              <strong>About:</strong>{" "}I&apos;m Afzal, an internet artist/designer/craftsman. Aex Designs is my
              digital playground/archive/canvas, where I share experiments, wip,
              releases, writings, and more. I&apos;m currently focused on art,
              publishing a new artwork every day. My work is primarily generative,
              rooted in abstraction and geometric forms, while continuously
              exploring new directions and mediums. Explore my work, use
              assets like fonts, or read my writings. All works are released under{" "}
              <a
                href="https://creativecommons.org/public-domain/cc0/"
                className="notion-link link"
                data-server-link={false}
                data-link-uri="https://creativecommons.org/public-domain/cc0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC0
              </a>
              . No rights reserved. Use, remix, and build freely.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
