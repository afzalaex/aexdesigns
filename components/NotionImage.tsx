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

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
}
