"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch"
> & {
  href: string;
};

export function IntentPrefetchLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const hasPrefetchedRef = useRef(false);

  function prefetchOnce() {
    if (hasPrefetchedRef.current) {
      return;
    }

    hasPrefetchedRef.current = true;
    void router.prefetch(href);
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetchOnce();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetchOnce();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetchOnce();
      }}
    />
  );
}
