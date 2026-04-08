"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { CardImageSequenceContext } from "./ScrollReveal";

type NotionImageProps = {
  primarySrc: string;
  fallbackSrc?: string;
  alt: string;
  eager?: boolean;
};

function BaseNotionImage({
  primarySrc,
  fallbackSrc,
  alt,
  eager = false,
}: NotionImageProps) {
  const imageSequence = useContext(CardImageSequenceContext);
  const shouldLoad = imageSequence?.shouldLoad ?? true;
  const shouldRevealInSequence = imageSequence?.shouldReveal ?? true;
  const reportImageReady = imageSequence?.reportImageReady;
  const [src, setSrc] = useState(
    shouldLoad ? primarySrc || fallbackSrc || "" : ""
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasReportedReadyRef = useRef(false);

  useEffect(() => {
    hasReportedReadyRef.current = false;
    setIsLoaded(false);
    setSrc(shouldLoad ? primarySrc || fallbackSrc || "" : "");
  }, [shouldLoad, primarySrc, fallbackSrc]);

  if (!src) {
    return null;
  }

  const markImageReady = () => {
    if (hasReportedReadyRef.current) {
      return;
    }

    hasReportedReadyRef.current = true;
    reportImageReady?.();
  };

  const shouldReveal = isLoaded && shouldRevealInSequence;

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      style={{
        opacity: shouldReveal ? 1 : 0,
        transition: "opacity 0.5s ease-out",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
      onLoad={() => {
        setIsLoaded(true);
        markImageReady();
      }}
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0 && !isLoaded) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              setIsLoaded(true);
              markImageReady();
            });
          });
        }
      }}
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc);
          setIsLoaded(false);
          return;
        }

        markImageReady();
        setSrc("");
      }}
    />
  );
}

export function NotionImage(props: NotionImageProps) {
  return <BaseNotionImage {...props} />;
}

export function NotionCardImage(props: NotionImageProps) {
  return <BaseNotionImage {...props} eager={props.eager ?? true} />;
}
