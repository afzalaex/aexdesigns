"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./EveryDays2026Viewer.module.css";

const COLLECTION_URL = "/data/collection-2026.json";
const P5_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js";
const SKETCH_BASE_URL =
  "https://raw.githubusercontent.com/afzalaex/every-days-2026/main/sketches";
const LOADER_MIN_VISIBLE_MS = 180;
const RESUME_REFRESH_DEBOUNCE_MS = 15_000;
const COLLECTION_REFRESH_EVENT = "aex:every-days-collection";

type PoweredByLink = {
  href: string;
  label: string;
  viewBox: string;
  paths: readonly string[];
};

const POWERED_BY_LINKS: readonly PoweredByLink[] = [
  {
    href: "https://p5js.org",
    label: "Powered by p5.js",
    viewBox: "0 0 24 24",
    paths: [
      "M14.7,8.7l7.8-2.4L24,11l-7.8,2.7l4.8,6.8l-4.1,3l-5.1-6.7L7,23.3l-4-3l4.8-6.6L0,10.9l1.5-4.7l7.9,2.5V0.5h5.3L14.7,8.7L14.7,8.7z",
    ],
  },
  {
    href: "https://ethereum.org",
    label: "Powered by Ethereum",
    viewBox: "0 0 24 24",
    paths: ["M6,9.8h12v4.5H6V9.8z", "M3,0h18v4.5H3V0z", "M3,19.5h18V24H3V19.5z"],
  },
  {
    href: "https://docs.mint.vv.xyz/",
    label: "Powered by Mint",
    viewBox: "0 0 24 24",
    paths: ["M14.2,6v12H9.8V6H14.2z", "M24,3v18h-4.5V3H24z", "M4.5,3v18H0V3H4.5z"],
  },
] as const;

type Artwork = {
  id: number;
  name: string;
  file: string;
  description: string;
};

type CollectionResponse = {
  artworks?: unknown;
};

type CollectionRefreshDetail = {
  latestId: number | null;
};

type FrameState = "idle" | "loading" | "ready" | "error";

type FrameMessage = {
  source?: unknown;
  type?: unknown;
  artworkId?: unknown;
  message?: unknown;
};

type LoadingBar = {
  key: string;
  y: number;
  begin: string;
};

const LOADING_BARS: readonly LoadingBar[] = [
  { key: "top", y: 50, begin: "0s" },
  { key: "middle", y: 250, begin: "0.08s" },
  { key: "bottom", y: 450, begin: "0.16s" },
] as const;

function escapeInlineScriptContent(value: string): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

function normalizeArtwork(item: unknown): Artwork | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Partial<Record<keyof Artwork, unknown>>;
  const id = Number(candidate.id);
  const file = typeof candidate.file === "string" ? candidate.file.trim() : "";

  if (!Number.isInteger(id) || id <= 0 || file.length === 0) {
    return null;
  }

  return {
    id,
    name: typeof candidate.name === "string" ? candidate.name : "",
    file,
    description:
      typeof candidate.description === "string" ? candidate.description : "",
  };
}

function normalizeCollection(data: unknown): Artwork[] {
  const response = data as CollectionResponse | null;
  const artworks = Array.isArray(response?.artworks) ? response.artworks : [];

  return artworks
    .map(normalizeArtwork)
    .filter((artwork): artwork is Artwork => artwork !== null)
    .sort((a, b) => a.id - b.id);
}

function getLatestArtworkId(artworks: Artwork[]): number | null {
  const latestArtwork = artworks[artworks.length - 1];
  return latestArtwork ? latestArtwork.id : null;
}

function areCollectionsEqual(first: Artwork[], second: Artwork[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((artwork, index) => {
    const otherArtwork = second[index];

    return (
      otherArtwork !== undefined &&
      artwork.id === otherArtwork.id &&
      artwork.name === otherArtwork.name &&
      artwork.file === otherArtwork.file &&
      artwork.description === otherArtwork.description
    );
  });
}

async function fetchCollection(): Promise<Artwork[]> {
  const url = `${COLLECTION_URL}?t=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Collection request failed with ${response.status}.`);
  }

  return normalizeCollection((await response.json()) as unknown);
}

function emitCollectionRefresh(artworks: Artwork[]): void {
  window.dispatchEvent(
    new CustomEvent<CollectionRefreshDetail>(COLLECTION_REFRESH_EVENT, {
      detail: {
        latestId: getLatestArtworkId(artworks),
      },
    })
  );
}

function formatArtworkLabel(artwork: Artwork): string {
  const name = artwork.name.trim().length > 0 ? artwork.name.trim() : "Untitled";
  return `${name} #${artwork.id}`;
}

function usePageResumeRefresh(onRefresh: () => void): void {
  useEffect(() => {
    function refreshIfVisible() {
      if (document.visibilityState !== "visible") {
        return;
      }

      onRefresh();
    }

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("pageshow", refreshIfVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("pageshow", refreshIfVisible);
    };
  }, [onRefresh]);
}

export function EveryDaysArtworkCounter({
  initialLatestId,
}: {
  initialLatestId: number;
}) {
  const [latestId, setLatestId] = useState(initialLatestId);

  useEffect(() => {
    function handleCollectionRefresh(event: Event) {
      const detail = (event as CustomEvent<CollectionRefreshDetail>).detail;

      if (typeof detail?.latestId === "number") {
        setLatestId(detail.latestId);
      }
    }

    window.addEventListener(COLLECTION_REFRESH_EVENT, handleCollectionRefresh);
    return () => {
      window.removeEventListener(COLLECTION_REFRESH_EVENT, handleCollectionRefresh);
    };
  }, []);

  return (
    <span className="site-top-stat" aria-live="polite">
      {`Artworks: ${latestId}`}
    </span>
  );
}

function EveryDaysLoadingIcon() {
  return (
    <div
      role="img"
      aria-label="Loading sketch"
      className={styles.loaderIcon}
    >
      {LOADING_BARS.map((bar) => {
        return (
          <span
            key={bar.key}
            className={`${styles.loaderBarBase} ${styles.loaderBarPulse}`}
            style={{ animationDelay: bar.begin }}
          />
        );
      })}
    </div>
  );
}

function buildSketchDocument(artwork: Artwork, sketchSource: string): string {
  const artworkIdLiteral = JSON.stringify(artwork.id);
  const p5ScriptLiteral = JSON.stringify(P5_SCRIPT_URL);
  const sketchUrlLiteral = JSON.stringify(`${SKETCH_BASE_URL}/${artwork.file}`);
  const sketchSourceLiteral = escapeInlineScriptContent(sketchSource);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #000;
        color: #fff;
        overflow: hidden;
      }

      body {
        display: grid;
        place-items: center;
        font-family: monospace;
      }

      #sketch {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
      }

      canvas {
        display: block;
        max-width: 100%;
        max-height: 100%;
        width: auto !important;
        height: auto !important;
      }
    </style>
    <script>
      (function () {
        var readySent = false;
        var host = null;
        var canvasWaitTimer = null;
        var fallbackStartTimer = null;
        var sketchSource = ${sketchSourceLiteral};

        function post(type, message) {
          parent.postMessage(
            {
              source: "aex-every-days-2026",
              type: type,
              artworkId: ${artworkIdLiteral},
              message: message || null
            },
            "*"
          );
        }

        function moveCanvas() {
          if (!host) {
            host = document.getElementById("sketch");
          }

          var canvas = document.querySelector("canvas");
          if (!host || !canvas) {
            return false;
          }

          if (canvas.parentElement !== host) {
            host.appendChild(canvas);
          }

          if (!readySent) {
            readySent = true;
            post("ready");
          }

          return true;
        }

        function waitForCanvas() {
          var attempts = 0;

          if (canvasWaitTimer) {
            window.clearInterval(canvasWaitTimer);
          }

          canvasWaitTimer = window.setInterval(function () {
            attempts += 1;

            if (moveCanvas()) {
              window.clearInterval(canvasWaitTimer);
              canvasWaitTimer = null;
              return;
            }

            if (attempts >= 40) {
              window.clearInterval(canvasWaitTimer);
              canvasWaitTimer = null;

              if (!readySent) {
                post("error", "Sketch did not initialize a canvas.");
              }
            }
          }, 50);
        }

        function injectSketchSource(source) {
          var script = document.createElement("script");
          script.text = source + "\\n//# sourceURL=" + ${sketchUrlLiteral};
          document.head.appendChild(script);
        }

        function startOnDemandGlobalMode() {
          if (readySent || window.__aexStarted) {
            return;
          }

          if (typeof window.p5 !== "function") {
            post("error", "p5.js did not finish loading.");
            return;
          }

          if (
            typeof window.setup !== "function" &&
            typeof window.draw !== "function" &&
            typeof window.preload !== "function"
          ) {
            post("error", "Sketch did not define setup(), draw(), or preload().");
            return;
          }

          window.__aexStarted = true;

          try {
            window.__aexInstance = new window.p5();
            waitForCanvas();
          } catch (error) {
            post(
              "error",
              error && error.message
                ? error.message
                : "Failed to start p5 global mode."
            );
          }
        }

        window.__aexPost = post;
        injectSketchSource(sketchSource);

        window.addEventListener("error", function (event) {
          post("error", event.message || "Unable to load sketch.");
        });

        var observer = new MutationObserver(function () {
          moveCanvas();
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });

        window.addEventListener("beforeunload", function () {
          if (fallbackStartTimer) {
            window.clearTimeout(fallbackStartTimer);
          }

          if (window.__aexInstance && typeof window.__aexInstance.remove === "function") {
            window.__aexInstance.remove();
          }
        });

        window.addEventListener("load", function () {
          waitForCanvas();

          fallbackStartTimer = window.setTimeout(function () {
            if (!readySent) {
              startOnDemandGlobalMode();
            }
          }, 120);
        });
      })();
    </script>
    <script src=${p5ScriptLiteral} onerror='window.__aexPost("error", "Failed to load p5.js.")'></script>
  </head>
  <body>
    <div id="sketch"></div>
  </body>
</html>`;
}

export function EveryDays2026Viewer() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sketchSource, setSketchSource] = useState<string | null>(null);
  const [isCollectionLoading, setIsCollectionLoading] = useState(true);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [frameState, setFrameState] = useState<FrameState>("idle");
  const [frameError, setFrameError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorId = useId();
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const loadingStartedAtRef = useRef<number | null>(null);
  const frameTransitionTimerRef = useRef<number | null>(null);
  const shouldFollowLatestRef = useRef(true);
  const lastCollectionRefreshAtRef = useRef(0);
  const collectionRequestIdRef = useRef(0);

  function clearPendingFrameTransition() {
    if (frameTransitionTimerRef.current !== null) {
      window.clearTimeout(frameTransitionTimerRef.current);
      frameTransitionTimerRef.current = null;
    }
  }

  function beginFrameLoading() {
    clearPendingFrameTransition();
    loadingStartedAtRef.current = window.performance.now();
    setFrameState("loading");
    setFrameError(null);
  }

  function settleFrame(nextState: Exclude<FrameState, "loading">, nextError: string | null) {
    clearPendingFrameTransition();

    const startedAt = loadingStartedAtRef.current;
    const elapsed = startedAt === null ? LOADER_MIN_VISIBLE_MS : window.performance.now() - startedAt;
    const remaining = LOADER_MIN_VISIBLE_MS - elapsed;

    if (remaining <= 0) {
      loadingStartedAtRef.current = null;
      setFrameState(nextState);
      setFrameError(nextError);
      return;
    }

    frameTransitionTimerRef.current = window.setTimeout(() => {
      frameTransitionTimerRef.current = null;
      loadingStartedAtRef.current = null;
      setFrameState(nextState);
      setFrameError(nextError);
    }, remaining);
  }

  const applyCollection = useCallback((nextArtworks: Artwork[]) => {
    const latestId = getLatestArtworkId(nextArtworks);

    setArtworks((currentArtworks) =>
      areCollectionsEqual(currentArtworks, nextArtworks)
        ? currentArtworks
        : nextArtworks
    );
    setCollectionError(
      nextArtworks.length === 0 ? "No 2026 artworks were found." : null
    );
    setSelectedId((current) => {
      if (latestId === null) {
        shouldFollowLatestRef.current = true;
        return null;
      }

      const currentStillExists =
        current !== null && nextArtworks.some((artwork) => artwork.id === current);
      const nextId =
        currentStillExists && !shouldFollowLatestRef.current ? current : latestId;

      shouldFollowLatestRef.current = nextId === latestId;
      return nextId;
    });
    emitCollectionRefresh(nextArtworks);
  }, []);

  const loadCollection = useCallback(
    (options: { silent?: boolean; force?: boolean } = {}) => {
      const now = Date.now();

      if (
        options.silent &&
        !options.force &&
        now - lastCollectionRefreshAtRef.current < RESUME_REFRESH_DEBOUNCE_MS
      ) {
        return;
      }

      lastCollectionRefreshAtRef.current = now;
      const requestId = collectionRequestIdRef.current + 1;
      collectionRequestIdRef.current = requestId;

      void fetchCollection()
        .then((nextArtworks) => {
          if (collectionRequestIdRef.current !== requestId) {
            return;
          }

          applyCollection(nextArtworks);
          setIsCollectionLoading(false);
        })
        .catch((error) => {
          if (collectionRequestIdRef.current !== requestId) {
            return;
          }

          console.error("Failed to load 2026 collection:", error);
          if (!options.silent) {
            setArtworks([]);
            setSelectedId(null);
            setCollectionError("Unable to load the 2026 collection.");
          }

          setIsCollectionLoading(false);
        });
    },
    [applyCollection]
  );

  useEffect(() => {
    loadCollection({ force: true });
  }, [loadCollection]);

  const refreshCollectionOnResume = useCallback(() => {
    loadCollection({ silent: true });
  }, [loadCollection]);

  usePageResumeRefresh(refreshCollectionOnResume);

  useEffect(() => {
    if (selectedId === null) {
      setSketchSource(null);
      if (isCollectionLoading) {
        beginFrameLoading();
      } else {
        clearPendingFrameTransition();
        loadingStartedAtRef.current = null;
        setFrameState("idle");
        setFrameError(null);
      }
      return;
    }

    const selectedArtwork = artworks.find((artwork) => artwork.id === selectedId);
    if (!selectedArtwork) {
      clearPendingFrameTransition();
      loadingStartedAtRef.current = null;
      setSketchSource(null);
      setFrameState("error");
      setFrameError("Selected artwork metadata is missing.");
      return;
    }

    let cancelled = false;
    const selectedFile = selectedArtwork.file;
    setSketchSource(null);
    beginFrameLoading();

    async function loadSketchSource() {
      try {
        const response = await fetch(`${SKETCH_BASE_URL}/${selectedFile}`, {
          cache: "no-store",
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`Sketch request failed with ${response.status}.`);
        }

        const source = await response.text();
        if (cancelled) {
          return;
        }

        setSketchSource(source);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load sketch source:", error);
        settleFrame(
          "error",
          error instanceof Error && error.message
            ? error.message
            : "Failed to load sketch source."
        );
      }
    }

    loadSketchSource();

    return () => {
      cancelled = true;
    };
  }, [artworks, isCollectionLoading, selectedId]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<FrameMessage>) {
      const data = event.data;

      if (!data || data.source !== "aex-every-days-2026") {
        return;
      }

      if (typeof data.artworkId !== "number" || data.artworkId !== selectedId) {
        return;
      }

      if (data.type === "ready") {
        settleFrame("ready", null);
        return;
      }

      if (data.type === "error") {
        settleFrame(
          "error",
          typeof data.message === "string" && data.message.trim().length > 0
            ? data.message
            : "Unable to load sketch."
        );
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [selectedId]);

  useEffect(() => {
    return () => {
      clearPendingFrameTransition();
    };
  }, []);

  useEffect(() => {
    if (!isSelectorOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSelectorOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelectorOpen]);

  const selectedArtwork =
    selectedId === null
      ? null
      : artworks.find((artwork) => artwork.id === selectedId) ?? null;
  const selectorArtworks = artworks.slice().reverse();
  const iframeDocument =
    selectedArtwork !== null && sketchSource !== null
      ? buildSketchDocument(selectedArtwork, sketchSource)
      : null;
  const description =
    selectedArtwork && selectedArtwork.description.trim().length > 0
      ? selectedArtwork.description.trim()
      : "";

  return (
    <div className={styles.root}>
      <div className={styles.selector} ref={selectorRef}>
        <button
          type="button"
          className={styles.select}
          aria-haspopup="listbox"
          aria-expanded={isSelectorOpen}
          aria-controls={selectorId}
          onClick={() => {
            if (artworks.length === 0) {
              return;
            }

            setIsSelectorOpen((current) => !current);
          }}
          disabled={artworks.length === 0}
        >
          <span>
            {selectedArtwork ? formatArtworkLabel(selectedArtwork) : "No artworks available"}
          </span>
          <span className={styles.selectChevron} aria-hidden="true">
            {isSelectorOpen ? "-" : "+"}
          </span>
        </button>
        {isSelectorOpen ? (
          <div className={styles.selectorMenuShell}>
            <div
              id={selectorId}
              className={styles.selectorMenu}
              role="listbox"
              aria-label="Artwork selector"
            >
              {selectorArtworks.map((artwork) => {
                const isSelected = artwork.id === selectedId;

                return (
                  <button
                    key={artwork.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.selectorOption}${isSelected ? ` ${styles.selectorOptionActive}` : ""}`}
                    onClick={() => {
                      shouldFollowLatestRef.current =
                        artwork.id === getLatestArtworkId(artworks);
                      setSelectedId(artwork.id);
                      setIsSelectorOpen(false);
                    }}
                  >
                    {formatArtworkLabel(artwork)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.canvasFrame}>
        <div id="sketch" className={styles.canvasShell}>
          {iframeDocument ? (
            <iframe
              key={selectedArtwork?.id}
              title={`Every Days 2026 artwork ${selectedArtwork?.id}`}
              className={`${styles.iframe}${frameState === "loading" ? ` ${styles.iframeLoading}` : ""}`}
              srcDoc={iframeDocument}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={styles.placeholder} aria-hidden="true" />
          )}

          {frameState === "loading" ? (
            <div className={styles.overlay} aria-live="polite">
              <EveryDaysLoadingIcon />
              <span className={styles.srOnly}>Loading sketch...</span>
            </div>
          ) : null}

          {frameState === "error" && frameError ? (
            <div className={styles.overlayError} role="alert">
              {frameError}
            </div>
          ) : null}
        </div>

        <div className={styles.canvasPlates}>
          {description ? (
            <p className={styles.descriptionStrip}>{description}</p>
          ) : (
            <div className={styles.plateSpacer} aria-hidden="true" />
          )}

          <div
            className={styles.poweredByStrip}
            aria-label="Powered by p5.js, Ethereum, and Mint"
          >
            <span className={styles.poweredByLabel}>Powered by</span>
            {POWERED_BY_LINKS.map((item) => (
              <a
                key={item.label}
                className={styles.poweredByLink}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
                title={item.label}
              >
                <svg
                  viewBox={item.viewBox}
                  aria-hidden="true"
                  className={styles.poweredByIcon}
                >
                  {item.paths.map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaHeader}>
          <div className={styles.metaMain}>

          </div>
        </div>
        {collectionError ? (
          <p
            className={`${styles.collectionError} notion-text notion-text__content notion-semantic-string`}
            role="alert"
          >
            {collectionError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
