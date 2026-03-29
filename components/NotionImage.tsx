"use client";

import { useEffect, useState } from "react";

type NotionImageProps = {
  primarySrc: string;
  fallbackSrc?: string;
  alt: string;
  eager?: boolean;
};

export function NotionImage({
  primarySrc,
  fallbackSrc,
  alt,
  eager = false,
}: NotionImageProps) {
  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "low"}
      decoding="async"
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
}

export function NotionCardImage({
  primarySrc,
  fallbackSrc,
  alt,
  eager = false,
}: NotionImageProps) {
  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  if (!src) {
    return null;
  }

  const handleError = () => {
    if (fallbackSrc && src !== fallbackSrc) {
      setSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "low"}
      decoding="async"
      onError={handleError}
    />
  );
}
