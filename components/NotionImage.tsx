"use client";

import { useEffect, useState, useContext } from "react";
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
  const isVisibleInSequence = useContext(CardImageSequenceContext);
  const [src, setSrc] = useState(primarySrc || fallbackSrc || "");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSrc(primarySrc || fallbackSrc || "");
  }, [primarySrc, fallbackSrc]);

  useEffect(() => {
    setIsLoaded(false); // Reset loading state when source changes
  }, [src]);

  if (!src) {
    return null;
  }

  const shouldReveal = isLoaded && isVisibleInSequence;

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
      onLoad={() => setIsLoaded(true)}
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0 && !isLoaded) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              setIsLoaded(true);
            });
          });
        }
      }}
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
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
