"use client";

import { useEffect, useState } from "react";

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
  const [src, setSrc] = useState(primarySrc || fallbackSrc || "");

  useEffect(() => {
    setSrc(primarySrc || fallbackSrc || "");
  }, [primarySrc, fallbackSrc]);

  if (!src) {
    return null;
  }

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

export function NotionImage(props: NotionImageProps) {
  return <BaseNotionImage {...props} />;
}

export function NotionCardImage(props: NotionImageProps) {
  return <BaseNotionImage {...props} eager={props.eager ?? true} />;
}
