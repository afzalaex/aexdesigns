# Aex Designs Website

Production website for `aex.design`, built with Next.js and Notion as the CMS.

## Overview
- Framework: Next.js App Router (TypeScript)
- Runtime baseline: Node `>=20.19.0`
- CMS: Notion (`@notionhq/client`)
- Hosting: Vercel
- Source of route truth: `content/route-map.json` and/or Notion database mode

## Project Structure
- `app/page.tsx`: homepage route
- `app/[...slug]/page.tsx`: mapped content routes
- `app/typeplayground/page.tsx`: static type playground route
- `app/api/notion-revalidate/route.ts`: on-demand cache invalidation endpoint
- `lib/notion.ts`: Notion routing/page/block data layer
- `components/NotionRenderer.tsx`: Notion block renderer
- `components/TypeTester.tsx`: native tester component
- `components/SitePage.tsx`: page shell + top action UI
- `components/EveryDays2026Viewer.tsx`: `/every-days` 2026 generative viewer
- `public/data/collection-2026.json`: 2026 artwork metadata registry
- `scripts/sync-collection-2026.mjs`: registry expansion utility
- `app/globals.css`: global and component styles

## Environment Variables
Required:
- `NOTION_TOKEN`
- `SITE_URL`

Optional:
- `NOTION_DATABASE_ID`
- `NOTION_HOME_PAGE_ID`
- `NOTION_SLUG_PROPERTY` (default: `Slug`)
- `NOTION_PUBLISHED_PROPERTY` (default: `Published`)
- `NOTION_DESCRIPTION_PROPERTY` (default: `Description`)
- `NOTION_CACHE_TTL_SECONDS` (default: `300`)
- `NOTION_REVALIDATE_SECRET` (required for secure revalidate endpoint usage)

## Core Commands
```powershell
npm install
npm run dev
npm run typecheck
npm run build
npm run start
npm run sync:collection-2026 -- 783
```

Local `/every-days` URL:
```text
http://localhost:3000/every-days
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
