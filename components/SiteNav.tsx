import Link from "next/link";
import { getRoutes, type RouteEntry } from "@/lib/notion";

const LOGO_SRC = "/assets/logo.svg";
const hiddenRouteSlugPattern = /-type-tester$/i;
const excludedNavSlugs = new Set(["/", "/typeplayground"]);

type NavChild = {
  slug: string;
  label: string;
};

type NavGroup = {
  slug: string;
  href: string;
  label: string;
  children: NavChild[];
};

function prettySlugPart(raw: string): string {
  return raw
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function rootSlugFromPath(slug: string): string {
  const segments = slug.replace(/^\//, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments[0]}`;
}

function childFallbackLabel(rootSlug: string, childSlug: string): string {
  const prefix = `${rootSlug}/`;
  const remainder = childSlug.startsWith(prefix)
    ? childSlug.slice(prefix.length)
    : childSlug.replace(/^\//, "");

  return remainder
    .split("/")
    .filter(Boolean)
    .map((segment) => prettySlugPart(segment))
    .join(" / ");
}

function buildDropdownGroups(routes: RouteEntry[]): NavGroup[] {
  const visibleRoutes = routes
    .filter((route) => !excludedNavSlugs.has(route.slug))
    .filter((route) => !hiddenRouteSlugPattern.test(route.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const bySlug = new Map(visibleRoutes.map((route) => [route.slug, route]));
  const childrenByRoot = new Map<string, RouteEntry[]>();

  for (const route of visibleRoutes) {
    const segments = route.slug.replace(/^\//, "").split("/").filter(Boolean);
    if (segments.length < 2) {
      continue;
    }

    const rootSlug = `/${segments[0]}`;
    const existing = childrenByRoot.get(rootSlug) ?? [];
    existing.push(route);
    childrenByRoot.set(rootSlug, existing);
  }

  const groups: NavGroup[] = Array.from(childrenByRoot.entries()).map(
    ([rootSlug, children]) => {
      const parentRoute = bySlug.get(rootSlug);
      const href = parentRoute?.slug ?? children[0]?.slug ?? rootSlug;
      const parentLabel =
        parentRoute?.title?.trim() ||
        prettySlugPart(rootSlugFromPath(rootSlug).replace(/^\//, ""));
      const uniqueChildren = Array.from(
        new Map(
          children
            .sort((a, b) => a.slug.localeCompare(b.slug))
            .map((child) => [
              child.slug,
              {
                slug: child.slug,
                label:
                  child.title?.trim() || childFallbackLabel(rootSlug, child.slug),
              },
            ])
        ).values()
      );

      return {
        slug: rootSlug,
        href,
        label: parentLabel,
        children: uniqueChildren,
      };
    }
  );

  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

export async function SiteNav() {
  const routes = await getRoutes().catch(() => []);
  const dropdownGroups = buildDropdownGroups(routes);

  return (
    <nav
      aria-label="Main"
      data-orientation="horizontal"
      dir="ltr"
      className="site-navbar site-navbar--simple"
      style={{
        position: "sticky",
        boxShadow: "var(--navbar-shadow)",
        WebkitBoxShadow: "var(--navbar-shadow)",
      }}
    >
      <div className="site-navbar__content">
        <Link href="/" className="notion-link site-navbar__logo" data-server-link={true} data-link-uri="/" prefetch={false}>
          <div className="site-navbar__logo-image">
            <span style={{ display: "contents" }}>
              <img
                alt="Logo"
                width={80}
                height={55}
                decoding="async"
                loading="eager"
                fetchPriority="high"
                style={{ color: "transparent", objectFit: "contain", objectPosition: "left" }}
                src={LOGO_SRC}
              />
            </span>
          </div>
        </Link>
        <div style={{ position: "relative" }}>
          <ul data-orientation="horizontal" className="site-navbar__item-list" dir="ltr">
            {dropdownGroups.map((group) => (
              <li key={group.slug} className="site-navbar__item">
                <Link
                  href={group.href}
                  className="site-navbar__item-link"
                  data-server-link={true}
                  data-link-uri={group.href}
                  prefetch={false}
                >
                  {group.label}
                </Link>
                <ul className="site-navbar__dropdown" aria-label={`${group.label} pages`}>
                  {group.children.map((child) => (
                    <li key={child.slug} className="site-navbar__dropdown-item">
                      <Link
                        href={child.slug}
                        className="site-navbar__dropdown-link"
                        data-server-link={true}
                        data-link-uri={child.slug}
                        prefetch={false}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="site-navbar__viewport-wrapper" />
    </nav>
  );
}
