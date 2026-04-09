"use client";

import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const initialRevealOffsetPx = 800;
const sequentialRevealGapMs = 70;
const imageReadyTimeoutMs = 3000;
const cardRevealObserverMarginPx = 120;
const gridImageLoadOffsetPx = initialRevealOffsetPx;

type SequentialCardGridImageSource = {
  primarySrc?: string;
  fallbackSrc?: string;
};

type CardImageSequenceContextValue = {
  shouldLoad: boolean;
  shouldReveal: boolean;
  reportImageReady: () => void;
};

type GridRevealEntry = {
  settled: boolean;
};

type GridRevealSequenceRegistrar = {
  batchVersion: number;
  register: (el: HTMLElement) => void;
  unregister: (el: HTMLElement) => void;
  markSettled: (el: HTMLElement) => void;
  isInitialBatchMember: (el: HTMLElement) => boolean;
  isInitialBatchReady: () => boolean;
};

export const CardImageSequenceContext =
  createContext<CardImageSequenceContextValue | null>(null);

const GridRevealSequenceContext =
  createContext<GridRevealSequenceRegistrar | null>(null);

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

function isWithinViewportOffset(
  target: HTMLElement,
  offsetPx: number
): boolean {
  const rect = target.getBoundingClientRect();
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;

  return rect.top <= viewportHeight + offsetPx;
}

function isInInitialRevealZone(target: HTMLElement): boolean {
  return isWithinViewportOffset(target, initialRevealOffsetPx);
}

function isInGridLoadZone(target: HTMLElement): boolean {
  return isWithinViewportOffset(target, gridImageLoadOffsetPx);
}

function shouldSkipTargetImageWait(target: HTMLElement): boolean {
  return target.dataset.scrollRevealSkipImageWait === "true";
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
  if (shouldSkipTargetImageWait(target)) {
    return Promise.resolve();
  }

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

function hasImageSource(source?: SequentialCardGridImageSource): boolean {
  return (
    (typeof source?.primarySrc === "string" &&
      source.primarySrc.trim().length > 0) ||
    (typeof source?.fallbackSrc === "string" &&
      source.fallbackSrc.trim().length > 0)
  );
}

export function ScrollRevealScope({ children }: { children: ReactNode }) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const gridEntriesRef = useRef(new Map<HTMLElement, GridRevealEntry>());
  const initialGridSetRef = useRef(new Set<HTMLElement>());
  const initialBatchReadyRef = useRef(true);
  const [batchVersion, setBatchVersion] = useState(0);

  const updateInitialBatchReady = useCallback((forceVersionBump = false) => {
    const initialGrids = Array.from(initialGridSetRef.current);
    const nextReady =
      initialGrids.length === 0 ||
      initialGrids.every((grid) => gridEntriesRef.current.get(grid)?.settled);

    if (!forceVersionBump && initialBatchReadyRef.current === nextReady) {
      return;
    }

    initialBatchReadyRef.current = nextReady;
    setBatchVersion((current) => current + 1);
  }, []);

  const registerInitialGridIfNeeded = useCallback((el: HTMLElement): boolean => {
    if (initialGridSetRef.current.has(el) || !isInInitialRevealZone(el)) {
      return false;
    }

    initialGridSetRef.current.add(el);
    return true;
  }, []);

  const registerGrid = useCallback(
    (el: HTMLElement) => {
      gridEntriesRef.current.set(el, { settled: false });
      const didAddInitialGrid = registerInitialGridIfNeeded(el);
      updateInitialBatchReady(didAddInitialGrid);
    },
    [registerInitialGridIfNeeded, updateInitialBatchReady]
  );

  const unregisterGrid = useCallback(
    (el: HTMLElement) => {
      gridEntriesRef.current.delete(el);
      initialGridSetRef.current.delete(el);
      updateInitialBatchReady(true);
    },
    [updateInitialBatchReady]
  );

  const markGridSettled = useCallback(
    (el: HTMLElement) => {
      const entry = gridEntriesRef.current.get(el);

      if (!entry || entry.settled) {
        return;
      }

      entry.settled = true;

      if (initialGridSetRef.current.has(el)) {
        updateInitialBatchReady();
      }
    },
    [updateInitialBatchReady]
  );

  const isInitialBatchMember = useCallback(
    (el: HTMLElement) => initialGridSetRef.current.has(el),
    []
  );

  const isInitialBatchReady = useCallback(
    () => initialBatchReadyRef.current,
    []
  );

  const gridSequenceRegistrar = useMemo<GridRevealSequenceRegistrar>(
    () => ({
      batchVersion,
      register: registerGrid,
      unregister: unregisterGrid,
      markSettled: markGridSettled,
      isInitialBatchMember,
      isInitialBatchReady,
    }),
    [
      batchVersion,
      isInitialBatchMember,
      isInitialBatchReady,
      markGridSettled,
      registerGrid,
      unregisterGrid,
    ]
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
    const initialTargets: HTMLElement[] = [];
    const nextInitialGridSet = new Set(
      Array.from(gridEntriesRef.current.keys()).filter((grid) =>
        isInInitialRevealZone(grid)
      )
    );
    const hasInitialGridMembershipChanged =
      nextInitialGridSet.size !== initialGridSetRef.current.size ||
      Array.from(nextInitialGridSet).some((grid) => !initialGridSetRef.current.has(grid));

    initialGridSetRef.current = nextInitialGridSet;
    updateInitialBatchReady(hasInitialGridMembershipChanged);

    for (const [index, target] of targets.entries()) {
      target.classList.add("scroll-reveal-target");
      target.style.setProperty("--scroll-reveal-order", String(index));

      if (isInInitialRevealZone(target)) {
        target.dataset.scrollPending = "true";
        initialTargets.push(target);
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
      await waitFrame();

      if ("fonts" in document) {
        await document.fonts.ready;
      }

      for (const target of initialTargets) {
        if (cancelled) {
          return;
        }

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
      initialGridSetRef.current = new Set();
      initialBatchReadyRef.current = true;
    };
  }, []);

  return (
    <GridRevealSequenceContext.Provider value={gridSequenceRegistrar}>
      <div ref={scopeRef} className="scroll-reveal-scope">
        {children}
      </div>
    </GridRevealSequenceContext.Provider>
  );
}

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

export function SequentialCardGrid({
  children,
  itemImageSources,
}: {
  children: ReactNode;
  itemImageSources?: SequentialCardGridImageSource[];
}) {
  const gridSequenceRegistrar = useContext(GridRevealSequenceContext);
  const gridRef = useRef<HTMLElement | null>(null);
  const readyImagesRef = useRef(new Set<number>());
  const hasMarkedSettledRef = useRef(false);
  const childNodes = Children.toArray(children);
  const imageSourceKey = (itemImageSources ?? [])
    .map((source) => `${source?.primarySrc ?? ""}|${source?.fallbackSrc ?? ""}`)
    .join("::");
  let trackedImageCount = 0;

  childNodes.forEach((_child, index) => {
    if (hasImageSource(itemImageSources?.[index])) {
      trackedImageCount += 1;
    }
  });

  const [shouldLoadImages, setShouldLoadImages] = useState(false);
  const [readyImageCount, setReadyImageCount] = useState(0);
  const [imagesSettled, setImagesSettled] = useState(trackedImageCount === 0);
  const registerGrid = gridSequenceRegistrar?.register;
  const unregisterGrid = gridSequenceRegistrar?.unregister;

  useLayoutEffect(() => {
    const grid = gridRef.current;

    if (!grid || !registerGrid || !unregisterGrid) {
      return;
    }

    registerGrid(grid);

    return () => {
      unregisterGrid(grid);
    };
  }, [registerGrid, unregisterGrid]);

  useEffect(() => {
    readyImagesRef.current.clear();
    hasMarkedSettledRef.current = false;
    setReadyImageCount(0);
    setImagesSettled(trackedImageCount === 0);
  }, [childNodes.length, imageSourceKey, trackedImageCount]);

  useEffect(() => {
    const grid = gridRef.current;

    if (!grid || childNodes.length === 0) {
      return;
    }

    const startLoading = () => {
      setShouldLoadImages(true);
    };

    if (isInGridLoadZone(grid)) {
      startLoading();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      startLoading();
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        startLoading();
      },
      {
        rootMargin: `${gridImageLoadOffsetPx}px 0px ${gridImageLoadOffsetPx}px 0px`,
      }
    );

    observer.observe(grid);

    return () => {
      observer.disconnect();
    };
  }, [childNodes.length]);

  useEffect(() => {
    if (!shouldLoadImages || imagesSettled || trackedImageCount === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setImagesSettled(true);
    }, imageReadyTimeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [imagesSettled, shouldLoadImages, trackedImageCount]);

  useEffect(() => {
    if (!shouldLoadImages || imagesSettled || trackedImageCount === 0) {
      return;
    }

    if (readyImageCount < trackedImageCount) {
      return;
    }

    setImagesSettled(true);
  }, [imagesSettled, readyImageCount, shouldLoadImages, trackedImageCount]);

  useEffect(() => {
    const grid = gridRef.current;

    if (
      !grid ||
      !gridSequenceRegistrar ||
      !imagesSettled ||
      hasMarkedSettledRef.current
    ) {
      return;
    }

    hasMarkedSettledRef.current = true;
    gridSequenceRegistrar.markSettled(grid);
  }, [gridSequenceRegistrar, imagesSettled]);

  const grid = gridRef.current;
  const isInitialBatchMember =
    !!grid && !!gridSequenceRegistrar?.isInitialBatchMember(grid);
  const canRevealGrid =
    shouldLoadImages &&
    imagesSettled &&
    (!isInitialBatchMember || !!gridSequenceRegistrar?.isInitialBatchReady());

  const reportImageReady = (index: number) => {
    if (!hasImageSource(itemImageSources?.[index])) {
      return;
    }

    const readyImages = readyImagesRef.current;

    if (readyImages.has(index)) {
      return;
    }

    readyImages.add(index);
    setReadyImageCount(readyImages.size);
  };

  if (childNodes.length === 0) {
    return null;
  }

  return (
    <div data-scroll-reveal-item="true" className="scroll-reveal-item">
      <section
        ref={gridRef}
        className="notion-card-grid"
        data-scroll-reveal-skip-image-wait="true"
      >
        {childNodes.map((child, index) => {
          const shouldRevealCard = canRevealGrid;

          return (
            <CardImageSequenceContext.Provider
              key={index}
              value={{
                shouldLoad: shouldLoadImages,
                shouldReveal: shouldRevealCard,
                reportImageReady: () => reportImageReady(index),
              }}
            >
              {child}
            </CardImageSequenceContext.Provider>
          );
        })}
      </section>
    </div>
  );
}
