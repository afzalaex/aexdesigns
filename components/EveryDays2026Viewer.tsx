"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./EveryDays2026Viewer.module.css";

const COLLECTION_URL = "/data/collection-2026.json";
const P5_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js";
const SKETCH_BASE_URL =
  "https://raw.githubusercontent.com/afzalaex/every-days-2026/main/sketches";

type Artwork = {
  id: number;
  name: string;
  file: string;
  description: string;
};

type CollectionResponse = {
  artworks?: unknown;
};

type FrameState = "idle" | "loading" | "ready" | "error";

type FrameMessage = {
  source?: unknown;
  type?: unknown;
  artworkId?: unknown;
  message?: unknown;
};

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

function formatArtworkLabel(artwork: Artwork): string {
  const name = artwork.name.trim().length > 0 ? artwork.name.trim() : "Untitled";
  return `${name} #${artwork.id}`;
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
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [frameState, setFrameState] = useState<FrameState>("idle");
  const [frameError, setFrameError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorId = useId();
  const selectorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCollection() {
      try {
        const response = await fetch(COLLECTION_URL, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Collection request failed with ${response.status}.`);
        }

        const data = (await response.json()) as unknown;
        const nextArtworks = normalizeCollection(data);

        if (cancelled) {
          return;
        }

        setArtworks(nextArtworks);
        setCollectionError(
          nextArtworks.length === 0 ? "No 2026 artworks were found." : null
        );
        setSelectedId((current) => {
          if (
            current !== null &&
            nextArtworks.some((artwork) => artwork.id === current)
          ) {
            return current;
          }

          const latestArtwork = nextArtworks[nextArtworks.length - 1];
          return latestArtwork ? latestArtwork.id : null;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load 2026 collection:", error);
        setArtworks([]);
        setSelectedId(null);
        setCollectionError("Unable to load the 2026 collection.");
      }
    }

    loadCollection();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setSketchSource(null);
      setFrameState("idle");
      setFrameError(null);
      return;
    }

    const selectedArtwork = artworks.find((artwork) => artwork.id === selectedId);
    if (!selectedArtwork) {
      setSketchSource(null);
      setFrameState("error");
      setFrameError("Selected artwork metadata is missing.");
      return;
    }

    let cancelled = false;
    const selectedFile = selectedArtwork.file;
    setSketchSource(null);
    setFrameState("loading");
    setFrameError(null);

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
        setFrameState("error");
        setFrameError(
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
  }, [artworks, selectedId]);

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
        setFrameState("ready");
        setFrameError(null);
        return;
      }

      if (data.type === "error") {
        setFrameState("error");
        setFrameError(
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
  const iframeDocument =
    selectedArtwork !== null && sketchSource !== null
      ? buildSketchDocument(selectedArtwork, sketchSource)
      : null;
  const artworkName =
    selectedArtwork === null
      ? "Artwork"
      : selectedArtwork.name.trim().length > 0
        ? selectedArtwork.name.trim()
        : "Untitled";
  const description =
    selectedArtwork && selectedArtwork.description.trim().length > 0
      ? selectedArtwork.description.trim()
      : "";

  return (
    <div className={styles.root}>
      <div id="sketch" className={styles.canvasShell}>
        {iframeDocument ? (
          <iframe
            key={selectedArtwork?.id}
            title={`Every Days 2026 artwork ${selectedArtwork?.id}`}
            className={styles.iframe}
            srcDoc={iframeDocument}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={styles.placeholder}>Select an artwork to load it.</div>
        )}

        {frameState === "loading" ? (
          <div className={styles.overlay} aria-live="polite">
            Loading sketch...
          </div>
        ) : null}

        {frameState === "error" && frameError ? (
          <div className={styles.overlayError} role="alert">
            {frameError}
          </div>
        ) : null}
      </div>

      <div className={styles.selector} ref={selectorRef}>
        <span className={styles.selectorLabel}>Artwork</span>
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
            {isSelectorOpen ? "−" : "+"}
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
              {artworks.map((artwork) => {
                const isSelected = artwork.id === selectedId;

                return (
                  <button
                    key={artwork.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.selectorOption}${isSelected ? ` ${styles.selectorOptionActive}` : ""}`}
                    onClick={() => {
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

      <div className={styles.meta}>
        <div className={styles.metaHeader}>
          <div className={styles.metaMain}>
            <p className={styles.name}>{artworkName}</p>
            <p className={`${styles.number} notion-text notion-semantic-string`}>
              {selectedArtwork ? `Artwork #${selectedArtwork.id}` : "Artwork"}
            </p>
            {description ? (
              <p className={`${styles.description} notion-text notion-semantic-string`}>
                {description}
              </p>
            ) : null}
          </div>

          <div className={styles.metaAside}>
            <p className={`${styles.collectionLink} notion-text notion-semantic-string`}>
              <a
                className="notion-link link"
                href="https://networked.art/0x237047f8b97ab581974acaec36e6abba793a29b1/0x0f3f91d3dee2d6172a3c496b392ebeaa26318842"
                target="_blank"
                rel="noreferrer"
              >
                Mint Collection
              </a>
            </p>
            <div className={styles.metaRail}>
              <p className={`${styles.network} notion-text notion-semantic-string`}>
                Built on Ethereum
              </p>
              <p className={`${styles.protocol} notion-text notion-semantic-string`}>
                Powered by{" "}
                <a
                  className="notion-link link"
                  href="https://docs.mint.vv.xyz/guide/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Mint Protocol VV
                </a>
              </p>
            </div>
          </div>
        </div>
        {collectionError ? (
          <p
            className={`${styles.collectionError} notion-text notion-semantic-string`}
            role="alert"
          >
            {collectionError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
