# Aex Designs Website

Production site for `https://aex.design`, built with Next.js App Router and Notion-backed content.

## Current Stack

Validated in the current lockfile / install:

- Node `>=20.19.0`
- Next.js `15.5.12`
- React `19.2.4`
- React DOM `19.2.4`
- TypeScript `5.9.3`
- Notion SDK `@notionhq/client 2.3.0`
- Hosting: Vercel

## Current Architecture

- Static shell routes:
  - `/` from [`app/page.tsx`](./app/page.tsx)
  - `/typeplayground` from [`app/typeplayground/page.tsx`](./app/typeplayground/page.tsx)
- Catch-all content routes from [`app/[...slug]/page.tsx`](./app/[...slug]/page.tsx)
- Primary route source: [`content/route-map.json`](./content/route-map.json)
- Optional runtime route source: Notion database mode via `NOTION_DATABASE_ID`
- Notion content fetch, retry, route resolution, page caching, and card hydration in [`lib/notion.ts`](./lib/notion.ts)
- Notion file-image proxy in [`app/api/notion-image/[blockId]/route.ts`](./app/api/notion-image/[blockId]/route.ts)
- On-demand cache invalidation in [`app/api/notion-revalidate/route.ts`](./app/api/notion-revalidate/route.ts)
- Native block/card reveal sequencing in [`components/ScrollReveal.tsx`](./components/ScrollReveal.tsx)
- Custom Notion renderer in [`components/NotionRenderer.tsx`](./components/NotionRenderer.tsx)
- `/every-days` viewer in [`components/EveryDays2026Viewer.tsx`](./components/EveryDays2026Viewer.tsx)

## Recent Working Behavior

The repo currently expects and documents these behaviors:

- Next.js 15 + React 19 app-router runtime
- Notion-hosted file images go through `/api/notion-image/[blockId]`
- External Notion image URLs render directly without proxying
- Card thumbnails resolve from a `Thumbnail` property first, then other file properties, then the Notion cover
- Child-page card grids on `/da`, `/assets`, and `/archive` preload and reveal in sequence
- Redirect aliases are active for:
  - `/collections/pixcapes -> /pixcapes`
  - `/designassetpack1 -> /dsp1`
  - `/designassetpack2 -> /dsp2`
- `/every-days` metadata ships from this repo, but sketch code is fetched live from `afzalaex/every-days-2026`

## Quick Start

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Local URLs:

```text
http://localhost:3000
http://localhost:3000/every-days
http://localhost:3000/typeplayground
```

## Project Map

- [`app/layout.tsx`](./app/layout.tsx): root metadata, icons, nav shell
- [`app/page.tsx`](./app/page.tsx): homepage route
- [`app/[...slug]/page.tsx`](./app/[...slug]/page.tsx): Notion-backed catch-all route
- [`app/typeplayground/page.tsx`](./app/typeplayground/page.tsx): static type playground
- [`app/sitemap.ts`](./app/sitemap.ts): sitemap generation
- [`components/SitePage.tsx`](./components/SitePage.tsx): page shell, top actions, `/every-days` marker placement
- [`components/NotionRenderer.tsx`](./components/NotionRenderer.tsx): block rendering, embeds, child-page cards, inline type testers
- [`components/NotionImage.tsx`](./components/NotionImage.tsx): image loading, fallback handling, staged reveal
- [`components/ScrollReveal.tsx`](./components/ScrollReveal.tsx): sequential block/card reveal orchestration
- [`components/TypePlayground.tsx`](./components/TypePlayground.tsx): static type playground UI
- [`components/TypeTester.tsx`](./components/TypeTester.tsx): reusable type tester
- [`public/data/collection-2026.json`](./public/data/collection-2026.json): `/every-days` metadata registry
- [`scripts/sync-collection-2026.mjs`](./scripts/sync-collection-2026.mjs): expands the 2026 collection file up to a target id
- [`scripts/seed-route-map-from-sitemap.mjs`](./scripts/seed-route-map-from-sitemap.mjs): bootstrap a route map from a sitemap
- [`scripts/fill-route-map-from-live-site.mjs`](./scripts/fill-route-map-from-live-site.mjs): enrich route-map entries from a live site

## Runtime Model

### Routing

- The homepage is hard-coded in `app/page.tsx`.
- The type playground is a static app route at `/typeplayground`.
- All other content pages resolve through `app/[...slug]/page.tsx`.
- `generateStaticParams()` prebuilds slugs from `content/route-map.json`.
- If `NOTION_DATABASE_ID` is set, runtime route lookup can read from a Notion database and fall back to the static map if the database read fails or returns nothing.

### Notion Content And Cache

- `lib/notion.ts` loads routes, page metadata, and recursive block trees from Notion.
- The app uses both `unstable_cache` and an in-process timed cache.
- Retries are built in for transient Notion failures and rate limits.
- `POST /api/notion-revalidate` clears route/page caches and triggers Next revalidation.

### Images

- External image URLs stored in Notion render directly.
- Notion-hosted file images are proxied through `/api/notion-image/[blockId]`.
- The proxy also accepts a `source` query string fallback for already-resolved hosted URLs.
- Card thumbnails prefer the Notion property named by `NOTION_THUMBNAIL_PROPERTY` and then fall back to other file properties or the page cover.

### Scroll Reveal And Cards

- Blocks are wrapped in `ScrollRevealItem` and coordinated by `ScrollRevealScope`.
- Initial viewport content reveals top-to-bottom after fonts are ready.
- Below-the-fold blocks are revealed with `IntersectionObserver`.
- Child-page card grids load images before revealing the batch so the grid can fade in coherently.

### `/every-days`

- Metadata comes from [`public/data/collection-2026.json`](./public/data/collection-2026.json).
- Sketch code is fetched live from `https://raw.githubusercontent.com/afzalaex/every-days-2026/main/sketches`.
- The current metadata file starts at id `733` and currently includes artwork `811` (`Chartaste`) at the top of the list.
- The viewer fetches `p5.js` from jsDelivr and runs each sketch inside a sandboxed iframe.

## Environment Variables

Copy `.env.example` to `.env.local` and set the values you actually use.

Required:

- `NOTION_TOKEN`: Notion integration token used for page and block fetches
- `SITE_URL`: canonical site URL such as `https://www.aex.design`

Optional routing:

- `NOTION_DATABASE_ID`: enables runtime route discovery from a Notion database
- `NOTION_HOME_PAGE_ID`: explicit page id to use for `/` if the route map does not include it
- `NOTION_SLUG_PROPERTY`: custom slug property name, default `Slug`
- `NOTION_PUBLISHED_PROPERTY`: custom publish flag property name, default `Published`
- `NOTION_DESCRIPTION_PROPERTY`: custom description property name, default `Description`
- `NOTION_THUMBNAIL_PROPERTY`: custom thumbnail property name, default `Thumbnail`

Optional cache and retry tuning:

- `NOTION_CACHE_TTL_SECONDS`: cache TTL for route/page caches, default `900`
- `NOTION_MAX_RETRIES`: max retriable Notion request attempts, default `4`
- `NOTION_RETRY_BASE_DELAY_MS`: retry backoff base delay, default `750`
- `NOTION_CHILD_BLOCK_FETCH_CONCURRENCY`: recursive child-block fetch concurrency, default `4`

Optional admin:

- `NOTION_REVALIDATE_SECRET`: required if you want to use the protected revalidation endpoint

## Commands

Core runtime:

```powershell
npm install
npm run dev
npm run typecheck
npm run build
npm run start
```

Content utilities:

```powershell
npm run sync:collection-2026 -- 811
npm run seed:route-map
npm run fill:route-map-live
```

Direct script forms:

```powershell
node scripts/seed-route-map-from-sitemap.mjs <sitemap-url> <output-file>
node scripts/fill-route-map-from-live-site.mjs <site-url> <route-map-file>
```

## Notion Content Workflow

Normal Notion text/content edits do not require a redeploy. Revalidate cache instead.

Single-page refresh:

```powershell
curl.exe -X POST https://www.aex.design/api/notion-revalidate `
  -H "x-revalidate-secret: YOUR_SECRET" `
  -H "content-type: application/json" `
  -d "{\"slug\":\"/typecheck\"}"
```

Full-site refresh:

```powershell
curl.exe -X POST https://www.aex.design/api/notion-revalidate `
  -H "x-revalidate-secret: YOUR_SECRET"
```

Optional local secret file:

```powershell
$env:REVALIDATE_SECRET = (Get-Content .secret -Raw).Trim()
curl.exe -X POST https://www.aex.design/api/notion-revalidate `
  -H "x-revalidate-secret: $env:REVALIDATE_SECRET"
```

Important:

- Revalidation clears runtime Notion cache and Next cache tags.
- Revalidation does not publish `/every-days` metadata changes.
- If `NOTION_REVALIDATE_SECRET` is missing, the endpoint returns an error instead of revalidating.

## `/every-days` 2026 Operating Model

The `/every-days` page depends on two separate repos.

Sketch source:

- local sibling repo: `..\every-days-2026`
- GitHub repo: `afzalaex/every-days-2026`
- file pattern: `sketches/<id>.js`
- loaded live at runtime from GitHub raw

Metadata and deploy:

- this repo: [`public/data/collection-2026.json`](./public/data/collection-2026.json)
- fields used by the site: `id`, `file`, `name`, `description`
- deployed by Vercel when `aex-site` is pushed

Current top metadata entry:

```json
{"id":811,"file":"811.js","name":"Chartaste","description":"Click to evolve"}
```

Important mismatch:

- the selector and the `Artworks:` count come from `public/data/collection-2026.json`
- the actual sketch code comes from `afzalaex/every-days-2026`
- if metadata ships before the matching sketch file is pushed, the newest item appears but fails to load

## Daily `/every-days` Release Flow

Run these in order.

### 1. Sync Both Repos

```powershell
Set-Location C:\Users\AMD\projects\every-days-2026
git pull --ff-only origin main
git status --short --branch

Set-Location C:\Users\AMD\projects\aex-site
git pull --ff-only origin main
git status --short --branch
```

### 2. Add And Push The Sketch Repo File First

From `C:\Users\AMD\projects\every-days-2026`:

```powershell
Set-Location C:\Users\AMD\projects\every-days-2026
Copy-Item .\sketches\810.js .\sketches\811.js
# edit .\sketches\811.js

git add .\sketches\811.js
git commit -m "add artwork 811"
git push origin main
```

Notes:

- Replace `810` and `811` with the actual previous and next ids.
- Skip `Copy-Item` if starting the new sketch from scratch.
- Do not publish metadata in `aex-site` until the sketch repo push succeeds.

### 3. Add Or Update Site Metadata Second

From `C:\Users\AMD\projects\aex-site`:

```powershell
Set-Location C:\Users\AMD\projects\aex-site
npm run sync:collection-2026 -- 811
# edit .\public\data\collection-2026.json
```

Fill the matching entry with:

- `id`
- `file`
- `name`
- `description`

### 4. Test Locally Before Push

```powershell
Set-Location C:\Users\AMD\projects\aex-site
npm run dev
```

Then open:

```text
http://localhost:3000/every-days
```

Verify:

- the selector shows the new title
- the newest sketch loads
- the description is correct
- the `Artworks:` count matches the latest id

### 5. Push `aex-site` To Trigger Deploy

```powershell
Set-Location C:\Users\AMD\projects\aex-site
npm run typecheck
npm run build
git add .\public\data\collection-2026.json
git commit -m "add every-days 811 metadata"
git push origin main
```

Deployment notes:

- Vercel auto-deploys from GitHub.
- A change to `public/data/collection-2026.json` requires a deploy.
- Notion revalidation alone will not publish a new 2026 artwork.

## Fast Recovery For "Latest Sketch Fails To Load"

This happens when metadata exists in `aex-site` but the matching sketch file is missing from `afzalaex/every-days-2026`.

### Check The Metadata Entry

```powershell
Set-Location C:\Users\AMD\projects\aex-site
rg -n '"id": 811|"file": "811.js"' .\public\data\collection-2026.json
```

### Check The Sketch Repo

```powershell
Set-Location C:\Users\AMD\projects\every-days-2026
Test-Path .\sketches\811.js
git status --short --branch
git log --oneline --decorate -5
```

If the file exists locally but is not on GitHub yet:

```powershell
git add .\sketches\811.js
git commit -m "add artwork 811"
git push origin main
```

Important:

- if only the sketch repo was missing the file, pushing `every-days-2026` is enough
- no `aex-site` redeploy is needed in that case because the site fetches the sketch live from GitHub raw
- after the push, hard refresh `/every-days`

## Notion Marker Placement

The 2026 viewer renders inside `/every-days` where a top-level Notion paragraph matches one of:

- `insert canvas here`
- `[[every-days-2026-canvas]]`
- `every-days-2026-canvas`

If the marker is missing, the viewer renders above the Notion content.

## Deployment

Standard production flow:

```powershell
git push origin main
```

Manual production deploy:

```powershell
npx vercel --prod --yes
```

## Notes

- Avoid committing secrets.
- `NOTION_TOKEN` and `NOTION_REVALIDATE_SECRET` must remain private.
- Hidden tester pages ending with `-type-tester` are intentionally excluded from child-page navigation.
