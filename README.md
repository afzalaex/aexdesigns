# Aex Designs Website

Production website for `aex.design`, built with Next.js App Router, TypeScript, and Notion-backed content.

## Overview

This repo powers the public site, including:

- a custom homepage
- Notion-driven content pages
- a static type playground
- the `/every-days` generative-art viewer
- on-demand cache revalidation for published Notion content

## Stack

- Node `>=20.19.0`
- Next.js 15
- React 19
- TypeScript
- Notion SDK (`@notionhq/client`)
- Vercel for deployment

Exact package versions live in [`package.json`](./package.json) and [`package-lock.json`](./package-lock.json).

## How The Site Is Structured

- [`app/page.tsx`](./app/page.tsx): homepage
- [`app/typeplayground/page.tsx`](./app/typeplayground/page.tsx): static type playground route
- [`app/[...slug]/page.tsx`](./app/[...slug]/page.tsx): catch-all route for Notion-backed pages
- [`app/layout.tsx`](./app/layout.tsx): root metadata, icons, global shell
- [`components/SitePage.tsx`](./components/SitePage.tsx): page shell and page-specific UI
- [`components/NotionRenderer.tsx`](./components/NotionRenderer.tsx): custom renderer for Notion blocks
- [`components/ScrollReveal.tsx`](./components/ScrollReveal.tsx): sequential reveal behavior for blocks and card grids
- [`components/EveryDays2026Viewer.tsx`](./components/EveryDays2026Viewer.tsx): `/every-days` viewer
- [`lib/notion.ts`](./lib/notion.ts): route resolution, page fetching, caching, retry logic
- [`lib/notion-images.ts`](./lib/notion-images.ts): image URL resolution for Notion blocks
- [`content/route-map.json`](./content/route-map.json): static route map for prebuilt slugs
- [`public/data/collection-2026.json`](./public/data/collection-2026.json): `/every-days` metadata

## Getting Started

1. Install dependencies:

```sh
npm install
```

2. Copy `.env.example` to `.env.local`.

3. Add the environment variables you need.

4. Start the dev server:

```sh
npm run dev
```

Useful local routes:

- `http://localhost:3000`
- `http://localhost:3000/typeplayground`
- `http://localhost:3000/every-days`

## Environment Variables

Required:

- `NOTION_TOKEN`: Notion integration token used to fetch pages and blocks
- `SITE_URL`: canonical site URL, for example `https://aex.design`

Optional routing:

- `NOTION_DATABASE_ID`: enables route discovery from a Notion database
- `NOTION_HOME_PAGE_ID`: explicit page id for `/` when needed
- `NOTION_SLUG_PROPERTY`: route slug property name, default `Slug`
- `NOTION_PUBLISHED_PROPERTY`: publish flag property name, default `Published`
- `NOTION_DESCRIPTION_PROPERTY`: description property name, default `Description`
- `NOTION_THUMBNAIL_PROPERTY`: thumbnail property name, default `Thumbnail`

Optional cache and retry tuning:

- `NOTION_CACHE_TTL_SECONDS`: cache TTL for route and page data, default `900`
- `NOTION_MAX_RETRIES`: max retriable Notion request attempts, default `4`
- `NOTION_RETRY_BASE_DELAY_MS`: retry backoff base delay, default `750`
- `NOTION_CHILD_BLOCK_FETCH_CONCURRENCY`: recursive child-block fetch concurrency, default `4`

Optional admin:

- `NOTION_REVALIDATE_SECRET`: protects the on-demand revalidation endpoint

Optional SEO:

- `GOOGLE_SITE_VERIFICATION`: Google Search Console HTML tag verification token. Use only the token from the `content` attribute, not the full meta tag.

See [`.env.example`](./.env.example) for the full template.

## Google Search Setup

The site exposes `/robots.txt` and `/sitemap.xml` from the canonical `SITE_URL`.
After deployment:

1. Add `https://aex.design` as a Google Search Console property.
2. If you choose HTML tag verification, set `GOOGLE_SITE_VERIFICATION` to the provided token and redeploy.
3. In Search Console, submit `https://aex.design/sitemap.xml`.
4. Use URL Inspection for priority pages such as the homepage, `/typeplayground`, and key project pages.

## Routing Model

- `/` is rendered by [`app/page.tsx`](./app/page.tsx).
- `/typeplayground` is a static app route.
- Other content pages are served by [`app/[...slug]/page.tsx`](./app/[...slug]/page.tsx).
- Static params for content routes are generated from [`content/route-map.json`](./content/route-map.json).
- If `NOTION_DATABASE_ID` is configured, runtime route lookup can also read from a Notion database.

This lets the site work in two modes:

- static route-map mode
- route-map plus Notion-database mode

## Notion Integration

[`lib/notion.ts`](./lib/notion.ts) is the core integration layer. It handles:

- route discovery
- page lookup by slug
- recursive block fetching
- retry behavior for transient Notion failures
- timed in-process caching
- Next.js cache tagging and revalidation support

### Images

- External image URLs stored in Notion are rendered directly.
- Notion-hosted file images are served through [`app/api/notion-image/[blockId]/route.ts`](./app/api/notion-image/[blockId]/route.ts).
- Card thumbnails can come from a configured thumbnail property, another file property, or a page cover.

### Revalidation

Use [`app/api/notion-revalidate/route.ts`](./app/api/notion-revalidate/route.ts) when content changes in Notion and you want those changes to appear without a redeploy.

Single-page example:

```sh
curl -X POST https://www.aex.design/api/notion-revalidate \
  -H "x-revalidate-secret: YOUR_SECRET" \
  -H "content-type: application/json" \
  -d '{"slug":"/typecheck"}'
```

Full-site example:

```sh
curl -X POST https://www.aex.design/api/notion-revalidate \
  -H "x-revalidate-secret: YOUR_SECRET"
```

Important:

- Revalidation updates cached Notion content.
- Revalidation does not publish new files from this repo.

## Rendering Behavior

The site does not render raw Notion pages directly. Instead, [`components/NotionRenderer.tsx`](./components/NotionRenderer.tsx) maps Notion blocks into the site's own UI.

That includes support for:

- headings, text, lists, quotes, toggles, dividers, and code blocks
- internal and external links
- image blocks
- child-page navigation and child-page cards
- inline type testers
- embeds

Reveal behavior is coordinated by [`components/ScrollReveal.tsx`](./components/ScrollReveal.tsx), which staggers initial content and coordinates image-heavy card-grid reveals.

## Type Playground

The type playground lives at `/typeplayground` and is backed by:

- [`app/typeplayground/page.tsx`](./app/typeplayground/page.tsx)
- [`components/TypePlayground.tsx`](./components/TypePlayground.tsx)
- [`components/TypeTester.tsx`](./components/TypeTester.tsx)

It provides a static interface for previewing bundled fonts and adjusting sample text.

## `/every-days`

The `/every-days` page has two data sources:

- metadata from [`public/data/collection-2026.json`](./public/data/collection-2026.json)
- sketch source fetched at runtime from `afzalaex/every-days-2026`

Production behavior:

- metadata is deployed with this repo
- sketch source is fetched live from GitHub raw

This means:

- changing only sketch code does not require redeploying this repo
- changing `collection-2026.json` does require a deploy
- if metadata references a sketch file that has not been pushed to the sketch repo yet, the newest entry can appear but fail to load

### Marker Placement

The viewer can be inserted at a specific point in the Notion page when a top-level paragraph matches one of:

- `insert canvas here`
- `[[every-days-2026-canvas]]`
- `every-days-2026-canvas`

If no marker is present, the viewer is rendered above the page content.

### Typical Update Flow

1. Add and push the new sketch file in the `every-days-2026` repo.
2. Run `npm run sync:collection-2026` in this repo to add the next metadata entry.
3. Test `/every-days` locally.
4. Push this repo to trigger deployment of the metadata change.

The sync script reads the current maximum ID from
[`public/data/collection-2026.json`](./public/data/collection-2026.json), adds
the next integer ID automatically, and keeps the file ordered newest first. It
also validates the existing IDs before writing, including duplicate IDs, gaps in
the sequence, and mismatched `id`/`file` pairs. If the current newest entry still
has a blank `name`, the script stops instead of adding another placeholder.

Validation-only commands:

```sh
npm run sync:collection-2026 -- --check
npm run sync:collection-2026 -- --dry-run
```

Use `--check` to verify the current JSON without writing. Use `--dry-run` to see
which ID the next normal sync would add.

## Scripts

Core runtime:

```sh
npm run dev
npm run typecheck
npm run build
npm run start
```

Content utilities:

```sh
npm run sync:collection-2026
npm run sync:collection-2026 -- --check
npm run seed:route-map
npm run fill:route-map-live
```

Direct script usage:

```sh
node scripts/seed-route-map-from-sitemap.mjs <sitemap-url> <output-file>
node scripts/fill-route-map-from-live-site.mjs <site-url> <route-map-file>
```

## Deployment

Standard production flow:

```sh
git push origin main
```

Manual production deploy:

```sh
npx vercel --prod --yes
```

## Notes

- Do not commit secrets.
- `NOTION_TOKEN` and `NOTION_REVALIDATE_SECRET` must remain private.
- Hidden tester pages ending with `-type-tester` are intentionally excluded from child-page navigation.
