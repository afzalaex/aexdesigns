# Aex Designs Website

Production website for `aex.design`, built with Next.js and Notion as the CMS.

## Overview
- Framework: Next.js App Router (TypeScript)
- Runtime baseline: Node `>=20.19.0`
- CMS: Notion (`@notionhq/client`)
- Hosting: Vercel
- Primary route source: `content/route-map.json`
- Optional live route source: Notion database mode via `NOTION_DATABASE_ID`

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
```

## Repo Guide
- `app/page.tsx`: homepage route
- `app/[...slug]/page.tsx`: catch-all content route for mapped Notion pages
- `app/typeplayground/page.tsx`: static type playground page
- `app/api/notion-image/[blockId]/route.ts`: Notion file image proxy
- `app/api/notion-revalidate/route.ts`: on-demand cache invalidation endpoint
- `lib/notion.ts`: route discovery, page fetch, block fetch, cache, retry logic
- `lib/notion-images.ts`: image source resolution for Notion blocks
- `components/NotionRenderer.tsx`: Notion block renderer
- `components/SitePage.tsx`: page shell and page-specific UI
- `components/EveryDays2026Viewer.tsx`: `/every-days` 2026 generative viewer
- `public/data/collection-2026.json`: `/every-days` metadata registry
- `content/route-map.json`: static route map used for prerendered content slugs
- `scripts/`: local maintenance utilities

## How It Works
### Routing
- The homepage lives at `app/page.tsx`.
- Content pages are served by `app/[...slug]/page.tsx`.
- During build, the catch-all route prebuilds slugs from `content/route-map.json`.
- If `NOTION_DATABASE_ID` is set, runtime route discovery can also read from a Notion database.

### Content And Cache
- `lib/notion.ts` fetches route entries, page metadata, and recursive block trees from Notion.
- The app uses Next cache tags plus an in-process timed cache to avoid repeated Notion work.
- `app/api/notion-revalidate/route.ts` clears those caches when you want content updates without a redeploy.

### Images
- Notion-hosted file images are served through `app/api/notion-image/[blockId]/route.ts`.
- External image URLs already stored in Notion are rendered directly.
- There is no active R2 or Cloudflare image migration path in the repo anymore.

### Sequencer & Scroll Reveal
- Implemented natively via `ScrollRevealScope`, `ScrollRevealItem`, and `SequentialCardGrid` components.
- Notion blocks, typography tools, and card layouts organically fade in via a deterministic tracking sequence (70ms stagger) preventing premature flicker.
- Content situated deep below the viewport is natively monitored using an `IntersectionObserver` to trigger seamlessly when scrolled into view.
- To seamlessly handle massive media, the sequencer forces a deliberate stagger hold until the network parses custom typography (`document.fonts.ready`) and large images, enforced by a graceful 4-second timeout limit.

### `/every-days`
- The `/every-days` page combines local metadata from `public/data/collection-2026.json` with sketch files fetched live from the sibling `every-days-2026` repo / GitHub raw.
- Metadata deploys with this repo.
- Sketch code is fetched at runtime from the sketch repo.

## Environment Variables
Copy `.env.example` to `.env.local` and fill in the values you actually use.

Required:
- `NOTION_TOKEN`: Notion integration token used for page and block fetches
- `SITE_URL`: canonical site URL such as `https://www.aex.design`

Optional routing:
- `NOTION_DATABASE_ID`: enables live route discovery from a Notion database
- `NOTION_HOME_PAGE_ID`: explicit page id to use for `/` when needed
- `NOTION_SLUG_PROPERTY`: route slug property name, default `Slug`
- `NOTION_PUBLISHED_PROPERTY`: publish flag property name, default `Published`
- `NOTION_DESCRIPTION_PROPERTY`: description property name, default `Description`

Optional cache and retry tuning:
- `NOTION_CACHE_TTL_SECONDS`: cache TTL for Notion routes/pages, default `900`
- `NOTION_MAX_RETRIES`: max retriable Notion request attempts, default `4`
- `NOTION_RETRY_BASE_DELAY_MS`: retry backoff base delay, default `750`
- `NOTION_CHILD_BLOCK_FETCH_CONCURRENCY`: recursive child-block fetch concurrency, default `4`

Optional admin:
- `NOTION_REVALIDATE_SECRET`: required if you want to use the secure revalidation endpoint

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
npm run sync:collection-2026 -- 783
npm run seed:route-map
npm run fill:route-map-live
```

## Notion Content Workflow
For normal Notion content edits, do not redeploy. Revalidate cache instead.

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
- Revalidation clears runtime Notion cache and triggers ISR path revalidation.
- Revalidation does not publish `/every-days` 2026 metadata changes.

## `/every-days` 2026 Operating Model
The `/every-days` page depends on two separate repos.

Sketch source:
- sibling repo: `..\every-days-2026`
- GitHub repo: `afzalaex/every-days-2026`
- file pattern: `sketches/<id>.js`
- loaded live at runtime from GitHub raw

Metadata and deploy:
- this repo: `public/data/collection-2026.json`
- fields used by the site: `id`, `file`, `name`, `description`
- deployed by Vercel when `aex-site` is pushed

Important mismatch:
- the selector and the `Artworks:` count come from `public/data/collection-2026.json`
- the actual sketch code comes from `afzalaex/every-days-2026`
- if metadata ships before the matching sketch file is pushed, the newest item appears but fails to load

Example metadata entry:
```json
{
  "id": 783,
  "file": "783.js",
  "name": "Trancelestial",
  "description": ""
}
```

## Daily `/every-days` Release Flow
Run these steps in order. The order matters.

### 1. Sync Both Repos First
```powershell
Set-Location C:\Users\AMD\projects\every-days-2026
git pull --ff-only origin main
git status --short --branch

Set-Location C:\Users\AMD\projects\aex-site
git pull --ff-only origin main
git status --short --branch
```

### 2. Add And Push The New Sketch Repo File First
From `C:\Users\AMD\projects\every-days-2026`:

```powershell
Set-Location C:\Users\AMD\projects\every-days-2026
Copy-Item .\sketches\782.js .\sketches\783.js
# edit .\sketches\783.js

git add .\sketches\783.js
git commit -m "add artwork 783"
git push origin main
```

Notes:
- Replace `782` and `783` with the actual previous and next ids.
- Skip `Copy-Item` if starting the new sketch from scratch.
- Do not publish metadata in `aex-site` until this push succeeds.

### 3. Add Or Update Site Metadata Second
From `C:\Users\AMD\projects\aex-site`:

```powershell
Set-Location C:\Users\AMD\projects\aex-site
npm run sync:collection-2026 -- 783
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
git commit -m "add every-days 783 metadata"
git push origin main
```

Deployment notes:
- Vercel auto-deploys from GitHub.
- A change to `public/data/collection-2026.json` requires a deploy.
- Notion revalidation alone will not publish a new 2026 artwork.

## Fast Recovery For "Latest Sketch Fails To Load"
This is the exact failure mode that happens when metadata exists in `aex-site` but the matching sketch file is missing from `afzalaex/every-days-2026`.

### Check The Metadata Entry
```powershell
Set-Location C:\Users\AMD\projects\aex-site
rg -n '"id": 783|"file": "783.js"' .\public\data\collection-2026.json
```

### Check The Sketch Repo
```powershell
Set-Location C:\Users\AMD\projects\every-days-2026
Test-Path .\sketches\783.js
git status --short --branch
git log --oneline --decorate -5
```

If the file exists locally but is not on GitHub yet:
```powershell
git add .\sketches\783.js
git commit -m "add artwork 783"
git push origin main
```

Important:
- if only the sketch repo was missing the file, pushing `every-days-2026` is enough
- no `aex-site` redeploy is needed in that case because the site fetches the sketch live from GitHub raw
- after the push, hard refresh `/every-days`

## Release Checklist
Before pushing `aex-site`, confirm all of these are true:

- the new `sketches/<id>.js` file exists in `..\every-days-2026`
- the sketch repo commit is already on `origin/main`
- `public/data/collection-2026.json` contains the same `<id>` and `file`
- the metadata entry has the correct `name`
- the new sketch loads locally at `http://localhost:3000/every-days`
- there are no unrelated staged files in either repo

## Notion Marker Placement
The 2026 viewer renders inside `/every-days` where a top-level Notion paragraph matches one of:
- `insert canvas here`
- `[[every-days-2026-canvas]]`
- `every-days-2026-canvas`

If the marker is missing, the viewer renders above the Notion content.

## Route Map Utilities
- `npm run seed:route-map`
- `npm run fill:route-map-live`
- `node scripts/seed-route-map-from-sitemap.mjs <sitemap-url> <output-file>`
- `node scripts/fill-route-map-from-live-site.mjs <site-url> <route-map-file>`

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
