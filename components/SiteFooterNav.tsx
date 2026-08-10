"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import routeMap from "@/content/route-map.json";
import { IntentPrefetchLink } from "./IntentPrefetchLink";

type RouteMapEntry = {
  slug?: string;
  title?: string;
};

type BreadcrumbItem = {
  href: string;
  label: string;
};

const labelOverrides: Record<string, string> = {
  "/": "Home",
  "/cc": "CC",
  "/ccarchive": "CC Archive",
  "/da": "Design/Art",
  "/ta": "Tools/Assets",
  "/assets": "Tools/Assets",
  "/ig": "IG",
  "/gh": "GH",
  "/typeplayground": "Type Playground",
  "/type-playground": "Type Playground",
};

const socialLinks = [
  {
    href: "https://x.com/aexdesigns",
    icon: "/assets/social/x-icon.svg",
    label: "X",
  },
  {
    href: "https://instagram.com/aex_designs",
    icon: "/assets/social/ig-icon.svg",
    label: "Instagram",
  },
  {
    href: "https://github.com/afzalaex",
    icon: "/assets/social/gh-icon.svg",
    label: "GitHub",
  },
  {
    href: "https://letter.aex.design/",
    icon: "/assets/social/ss-icon.svg",
    label: "Newsletter",
  },
] as const;

const virtualParentBySlug: Record<string, BreadcrumbItem> = {
  "/aexthetics": { href: "/da", label: "Design/Art" },
  "/aexpective": { href: "/ta", label: "Tools/Assets" },
  "/aextract": { href: "/ta", label: "Tools/Assets" },
  "/aextract36": { href: "/ta", label: "Tools/Assets" },
  "/cc": { href: "/da", label: "Design/Art" },
  "/designassetpack1": { href: "/ta", label: "Tools/Assets" },
  "/designassetpack2": { href: "/ta", label: "Tools/Assets" },
  "/dsp1": { href: "/ta", label: "Tools/Assets" },
  "/dsp2": { href: "/ta", label: "Tools/Assets" },
  "/emopepen": { href: "/da", label: "Design/Art" },
  "/every-days": { href: "/da", label: "Design/Art" },
  "/nounty": { href: "/ta", label: "Tools/Assets" },
  "/p5nels": { href: "/ta", label: "Tools/Assets" },
  "/pixcapes": { href: "/da", label: "Design/Art" },
  "/remix": { href: "/da", label: "Design/Art" },
  "/typecheck": { href: "/ta", label: "Tools/Assets" },
  "/typeplayground": { href: "/ta", label: "Tools/Assets" },
  "/type-playground": { href: "/ta", label: "Tools/Assets" },
};

function normalizeSlug(raw: string): string {
  const withoutQuery = raw.trim().split(/[?#]/)[0] ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const cleaned = withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");

  return cleaned || "/";
}

const routeTitleBySlug = new Map<string, string>();

for (const entry of (Array.isArray(routeMap) ? routeMap : []) as RouteMapEntry[]) {
  if (typeof entry.slug !== "string" || typeof entry.title !== "string") {
    continue;
  }

  const slug = normalizeSlug(entry.slug);
  const title = entry.title.trim();

  if (title) {
    routeTitleBySlug.set(slug, title);
  }
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function titleFromSegment(segment: string): string {
  const words = decodeSegment(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!words) {
    return "";
  }

  return words.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function labelForSlug(slug: string, segment: string): string {
  const normalizedSlug = normalizeSlug(slug);

  return (
    labelOverrides[normalizedSlug] ??
    routeTitleBySlug.get(normalizedSlug) ??
    titleFromSegment(segment)
  );
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const currentSlug = normalizeSlug(pathname);
  const breadcrumbs: BreadcrumbItem[] = [{ href: "/", label: labelOverrides["/"] }];

  if (currentSlug === "/") {
    return breadcrumbs;
  }

  const virtualParent = virtualParentBySlug[currentSlug];
  if (virtualParent) {
    breadcrumbs.push(virtualParent);
    breadcrumbs.push({
      href: currentSlug,
      label: labelForSlug(currentSlug, currentSlug.replace(/^\//, "")),
    });

    return breadcrumbs;
  }

  const segments = currentSlug.split("/").filter(Boolean);
  let href = "";

  for (const segment of segments) {
    href = `${href}/${segment}`;
    breadcrumbs.push({
      href,
      label: labelForSlug(href, segment),
    });
  }

  return breadcrumbs;
}

export function SiteBreadcrumbBar() {
  const pathname = usePathname() ?? "/";
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  if (normalizeSlug(pathname) === "/") {
    return null;
  }

  return (
    <nav className="site-breadcrumb-bar" aria-label="Breadcrumb">
      <div className="site-breadcrumb-bar__content">
        <div className="site-breadcrumb-bar__tag">
        <ol className="site-breadcrumb-bar__list">
          {breadcrumbs.map((breadcrumb, index) => {
            const isCurrent = index === breadcrumbs.length - 1;

            return (
              <li className="site-breadcrumb-bar__item" key={breadcrumb.href}>
                {index > 0 ? (
                  <span className="site-breadcrumb-bar__separator" aria-hidden="true">
                    ›
                  </span>
                ) : null}
                {isCurrent ? (
                  <span
                    className="site-breadcrumb-bar__label is-current"
                    aria-current="page"
                  >
                    {breadcrumb.label}
                  </span>
                ) : (
                  <IntentPrefetchLink
                    className="site-breadcrumb-bar__label"
                    href={breadcrumb.href}
                  >
                    {breadcrumb.label}
                  </IntentPrefetchLink>
                )}
              </li>
            );
          })}
        </ol>
        </div>
      </div>
    </nav>
  );
}

export function SiteSocialFooter() {
  const pathname = usePathname() ?? "/";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    let shown = false;
    let cancelled = false;
    let outerFrame = 0;
    let innerFrame = 0;

    const show = () => {
      if (shown || cancelled) {
        return;
      }

      shown = true;
      setVisible(true);
    };

    // Notion pages with ScrollReveal fire this after the intro sequence.
    window.addEventListener("site-reveal-done", show, { once: true });

    // Static app routes (e.g. /typeplayground) never mount ScrollRevealScope,
    // so they would otherwise wait for the long fallback timeout below.
    outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        if (!document.querySelector(".scroll-reveal-scope")) {
          show();
        }
      });
    });

    const fallbackTimer = window.setTimeout(show, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener("site-reveal-done", show);
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
      window.clearTimeout(fallbackTimer);
    };
  }, [pathname]);

  if (normalizeSlug(pathname) === "/") {
    return null;
  }

  return (
    <footer
      className="site-social-footer"
      style={{ opacity: visible ? 1 : 0, transition: visible ? "opacity 220ms ease-out" : "none" }}
    >
      <div className="site-social-footer__content">
        <nav className="site-social-footer__links" aria-label="Social links">
          {socialLinks.map((link) => (
            <a
              className="site-social-footer__link"
              href={link.href}
              key={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
            >
              <img
                className="site-social-footer__icon"
                src={link.icon}
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
              />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
