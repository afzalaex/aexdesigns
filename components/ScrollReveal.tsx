"use client";

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const initialRevealOffsetPx = 120;
const sequentialRevealGapMs = 70;
const imageReadyTimeoutMs = 1400;
const cardRevealObserverMarginPx = 120;
const cardGridGapPx = 18;
const cardGridMinWidthPx = 220;
const mobileBreakpointPx = 900;
const mobileCardGridColumns = 2;

type SequentialCardGridImageSource = {
  primarySrc?: string;
  fallbackSrc?: string;
};

// ─── Gate context ─────────────────────────────────────────────────────────────
// ScrollRevealScope provides this. Each SequentialCardGrid registers a "gate":
// an invisible sentinel that participates in the sequential reveal chain so
// the grid only starts (and the next block only reveals) after the grid is done.

type GateEntry = {
  /** Called by ScrollRevealScope to kick off the card sequence. */
  triggerStart: () => void;
  /** Resolves when every card in the grid has been revealed. */
  done: Promise<void>;
};

type RevealGateRegistrar = {
  register: (el: Element, entry: GateEntry) => void;
  unregister: (el: Element) => void;
};

const RevealGateContext = createContext<RevealGateRegistrar | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRevealTarget(item: HTMLElement): HTMLElement {
  const children = Array.from(item.children) as HTMLElement[];

  for (const child of children) {
    if (child.classList.contains("notion-heading__anchor")) {
      continue;
    }

    return child;
  }

  return item;
}

function isInInitialRevealZone(target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  return rect.top <= viewportHeight + initialRevealOffsetPx;
}

function waitForImageReady(image: HTMLImageElement): Promise<void> {
  const source = image.currentSrc || image.src;

  if (!source || image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const loader = new window.Image();
    let timeoutId: number | null = null;

    const finish = () => {
      loader.removeEventListener("load", finish);
      loader.removeEventListener("error", finish);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      resolve();
    };

    timeoutId = window.setTimeout(finish, imageReadyTimeoutMs);
    loader.addEventListener("load", finish, { once: true });
    loader.addEventListener("error", finish, { once: true });
    loader.decoding = "async";
    loader.src = source;

    if (loader.complete) {
      finish();
    }
  });
}

function waitForTargetReady(target: HTMLElement): Promise<void> {
  const image = target.querySelector("img");

  if (image instanceof HTMLImageElement) {
    return waitForImageReady(image);
  }

  return Promise.resolve();
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function isNearViewport(target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  return rect.top <= viewportHeight + cardRevealObserverMarginPx;
}

function waitForImageSourceReady(
  source?: SequentialCardGridImageSource
): Promise<void> {
  const candidates = [source?.primarySrc, source?.fallbackSrc].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );

  if (candidates.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId: number | null = null;
    let loader: HTMLImageElement | null = null;

    const cleanupLoader = () => {
      if (!loader) {
        return;
      }

      loader.onload = null;
      loader.onerror = null;
      loader = null;
    };

    const finish = () => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanupLoader();

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      resolve();
    };

    const tryCandidate = (index: number) => {
      if (resolved) {
        return;
      }

      cleanupLoader();

      if (index >= candidates.length) {
        finish();
        return;
      }

      loader = new window.Image();
      loader.decoding = "async";
      loader.onload = finish;
      loader.onerror = () => tryCandidate(index + 1);
      loader.src = candidates[index];

      if (loader.complete) {
        if (loader.naturalWidth > 0) {
          finish();
          return;
        }

        tryCandidate(index + 1);
      }
    };

    timeoutId = window.setTimeout(finish, imageReadyTimeoutMs);
    tryCandidate(0);
  });
}

// ─── ScrollRevealScope ────────────────────────────────────────────────────────

export function ScrollRevealScope({ children }: { children: ReactNode }) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  // Map from gate-sentinel element → gate entry, populated by SequentialCardGrid
  const gateMapRef = useRef(new Map<Element, GateEntry>());

  const registrar = useMemo<RevealGateRegistrar>(
    () => ({
      register: (el, entry) => {
        gateMapRef.current.set(el, entry);
      },
      unregister: (el) => {
        gateMapRef.current.delete(el);
      },
    }),
    []
  );

  useLayoutEffect(() => {
    const scope = scopeRef.current;

    if (!scope) {
      return;
    }

    const items = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-scroll-reveal-item="true"]')
    );
    const targets = items.map(getRevealTarget);
    const initialTargets: Array<{ target: HTMLElement; item: HTMLElement }> =
      [];

    for (const [index, target] of targets.entries()) {
      target.classList.add("scroll-reveal-target");
      target.style.setProperty("--scroll-reveal-order", String(index));

      if (isInInitialRevealZone(target)) {
        target.dataset.scrollPending = "true";
        initialTargets.push({ target, item: items[index] });
        continue;
      }

      target.dataset.scrollObserverPending = "true";
    }

    const scrollObserver = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.classList.add("is-visible");
            target.removeAttribute("data-scroll-observer-pending");
            scrollObserver.unobserve(target);
          }
        }
      },
      {
        rootMargin: `${cardRevealObserverMarginPx}px 0px ${cardRevealObserverMarginPx}px 0px`,
      }
    );

    for (const target of targets) {
      if (target.dataset.scrollObserverPending) {
        scrollObserver.observe(target);
      }
    }

    let cancelled = false;

    const runInitialReveal = async () => {
      // Wait one frame so child effects (gate registrations) can run first.
      await waitFrame();

      for (const { target, item } of initialTargets) {
        if (cancelled) {
          return;
        }

        // Is this slot a card-grid gate?
        const gateEntry = gateMapRef.current.get(item);

        if (gateEntry) {
          // Make the invisible sentinel "visible" (no visual effect).
          target.classList.add("is-visible");
          target.removeAttribute("data-scroll-pending");

          // Kick off the card sequence and wait until every card is shown.
          gateEntry.triggerStart();
          await gateEntry.done;

          if (cancelled) {
            return;
          }

          // Small gap before the next block starts.
          await waitMs(sequentialRevealGapMs);
          continue;
        }

        // Regular block: wait for its image then reveal it.
        await waitForTargetReady(target);

        if (cancelled) {
          return;
        }

        target.classList.add("is-visible");
        target.removeAttribute("data-scroll-pending");
        await waitMs(sequentialRevealGapMs);
      }
    };

    void runInitialReveal();

    return () => {
      cancelled = true;
      scrollObserver.disconnect();
    };
  }, []);

  return (
    <RevealGateContext.Provider value={registrar}>
      <div ref={scopeRef} className="scroll-reveal-scope">
        {children}
      </div>
    </RevealGateContext.Provider>
  );
}

// ─── ScrollRevealItem ─────────────────────────────────────────────────────────

export function ScrollRevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const classes = ["scroll-reveal-item", className].filter(Boolean).join(" ");

  return (
    <div data-scroll-reveal-item="true" className={classes}>
      {children}
    </div>
  );
}

// ─── SequentialCardGridItem ───────────────────────────────────────────────────

function SequentialCardGridItem({
  children,
  isVisible,
}: {
  children: ReactNode;
  isVisible: boolean;
}) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isPresented, setIsPresented] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setShouldRender(true);
  }, [isVisible]);

  useLayoutEffect(() => {
    if (!shouldRender) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsPresented(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className="scroll-reveal-item scroll-reveal-item--card"
      data-scroll-reveal-visible={isPresented ? "true" : undefined}
    >
      {children}
    </div>
  );
}

// ─── SequentialCardGrid ───────────────────────────────────────────────────────

export function SequentialCardGrid({
  children,
  itemImageSources,
}: {
  children: ReactNode;
  itemImageSources?: SequentialCardGridImageSource[];
}) {
  const gateRegistrar = useContext(RevealGateContext);
  const gateRef = useRef<HTMLSpanElement | null>(null);
  const resolveCompletionRef = useRef<(() => void) | null>(null);

  // Whether ScrollRevealScope has signalled this grid to start.
  const [gateTriggered, setGateTriggered] = useState(false);

  const gridRef = useRef<HTMLElement | null>(null);
  const childNodes = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(0);
  const [columnCount, setColumnCount] = useState(1);

  // Register the gate with ScrollRevealScope (runs before the scope's
  // layout effect because children effects fire first in React).
  useLayoutEffect(() => {
    if (!gateRegistrar || !gateRef.current) {
      return;
    }

    const gateEl = gateRef.current;

    const done = new Promise<void>((resolve) => {
      resolveCompletionRef.current = resolve;
    });

    const entry: GateEntry = {
      triggerStart: () => setGateTriggered(true),
      done,
    };

    gateRegistrar.register(gateEl, entry);

    return () => {
      gateRegistrar.unregister(gateEl);
    };
  }, [gateRegistrar]);

  // Column count from ResizeObserver.
  useLayoutEffect(() => {
    const grid = gridRef.current;

    if (!grid || childNodes.length === 0) {
      return;
    }

    const updateColumnCount = () => {
      const width = grid.clientWidth;

      if (width <= 0) {
        return;
      }

      const nextColumnCount =
        window.innerWidth <= mobileBreakpointPx
          ? mobileCardGridColumns
          : Math.max(
              1,
              Math.floor(
                (width + cardGridGapPx) / (cardGridMinWidthPx + cardGridGapPx)
              )
            );

      setColumnCount(Math.min(childNodes.length, nextColumnCount));
    };

    updateColumnCount();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateColumnCount);

      return () => {
        window.removeEventListener("resize", updateColumnCount);
      };
    }

    const observer = new ResizeObserver(() => {
      updateColumnCount();
    });

    observer.observe(grid);
    window.addEventListener("resize", updateColumnCount);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateColumnCount);
    };
  }, [childNodes.length]);

  // Start the card sequence.
  // • If inside ScrollRevealScope AND near viewport: wait for gate trigger.
  // • Otherwise: use IntersectionObserver (below-fold or no scope).
  useEffect(() => {
    const grid = gridRef.current;

    if (!grid || childNodes.length === 0) {
      return;
    }

    const startSequence = () => {
      setActiveIndex((current) => (current < 0 ? 0 : current));
    };

    // Inside a ScrollRevealScope and in the initial viewport: let the
    // scope drive the start via the gate trigger.
    if (gateRegistrar && isNearViewport(grid)) {
      if (gateTriggered) {
        startSequence();
      }
      return;
    }

    // Below the fold or no scope present: use viewport / IntersectionObserver.
    if (isNearViewport(grid)) {
      startSequence();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      startSequence();
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        startSequence();
      },
      {
        rootMargin: `${cardRevealObserverMarginPx}px 0px ${cardRevealObserverMarginPx}px 0px`,
      }
    );

    observer.observe(grid);

    return () => {
      observer.disconnect();
    };
  }, [childNodes.length, gateRegistrar, gateTriggered]);

  // Resolve the gate's done-promise once every card is visible.
  useEffect(() => {
    if (childNodes.length === 0 || activeIndex < childNodes.length) {
      return;
    }

    resolveCompletionRef.current?.();
    resolveCompletionRef.current = null;
  }, [activeIndex, childNodes.length]);

  // Advance the activeIndex card by card.
  useEffect(() => {
    if (
      activeIndex < 0 ||
      activeIndex >= childNodes.length ||
      activeIndex < visibleCount
    ) {
      return;
    }

    let cancelled = false;
    const currentIndex = activeIndex;

    const revealCurrentCard = async () => {
      await waitForImageSourceReady(itemImageSources?.[currentIndex]);

      if (cancelled) {
        return;
      }

      setVisibleCount((current) => Math.max(current, currentIndex + 1));
      await waitMs(sequentialRevealGapMs);

      if (cancelled) {
        return;
      }

      setActiveIndex((current) =>
        current === currentIndex ? currentIndex + 1 : current
      );
    };

    void revealCurrentCard();

    return () => {
      cancelled = true;
    };
  }, [activeIndex, childNodes.length, itemImageSources]);

  if (childNodes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Invisible sentinel participates in ScrollRevealScope's chain */}
      <span
        ref={gateRef}
        data-scroll-reveal-item="true"
        data-card-grid-gate="true"
        aria-hidden="true"
        style={{
          display: "block",
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />
      <section
        ref={gridRef}
        className="notion-card-grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, columnCount)}, minmax(0, 1fr))`,
        }}
      >
        {childNodes.map((child, index) => (
          <SequentialCardGridItem
            key={index}
            isVisible={visibleCount > index}
          >
            {child}
          </SequentialCardGridItem>
        ))}
      </section>
    </>
  );
}
