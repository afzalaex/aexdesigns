# Aex Designs Website

Production website for `aex.design`, built with Next.js and Notion as the CMS.

## Overview
- Framework: Next.js App Router (TypeScript)
- Runtime baseline: Node `>=20.19.0`
- CMS: Notion (`@notionhq/client`)
- Hosting: Vercel
- Source of route truth: `content/route-map.json` and/or Notion database mode

## Key Features
- Notion block rendering with custom local UI (`components/NotionRenderer.tsx`)
- Native type tester system (`components/TypeTester.tsx`)
- Dedicated `/typeplayground` page with interactive font testers
- Hybrid `/every-days` system:
  - 2024/2025 remain Notion-rendered
  - 2026 generative viewer is repo-driven and loaded from external p5 sketches
- Page-level top actions (license/mint + release year + buy/get)
- Performance-first delivery:
  - ISR for route HTML (`revalidate = 3600`)
  - SSG for mapped slugs via `generateStaticParams`
  - in-memory Notion TTL cache with stale-while-refresh and request deduping

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

## Content Update Workflow (Important)
For normal Notion content edits, do not redeploy. Revalidate cache instead.

Single page refresh:
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

The endpoint clears runtime Notion cache and triggers ISR path revalidation.

## `/every-days` 2026 Workflow
The `/every-days` page is split:
- 2024/2025 content: still rendered from Notion
- 2026 content: rendered by the local viewer component and metadata JSON

### Where To Edit
- Sketch source:
  - external repo `afzalaex/every-days-2026`
  - path pattern: `sketches/<id>.js`
- Artwork metadata in this repo:
  - `public/data/collection-2026.json`
  - editable fields per artwork:
    - `name`
    - `description`

Example:
```json
{
  "id": 781,
  "name": "Example Artwork",
  "file": "781.js",
  "description": "Short description."
}
```

### Add More Artwork IDs
To add blank entries past the current max ID:
```bash
npm run sync:collection-2026 -- 782
```

That preserves existing metadata and appends blank entries up to the ID you pass.

### Notion Marker Placement
The 2026 viewer renders inside `/every-days` where a top-level Notion paragraph matches one of:
- `insert canvas here`
- `[[every-days-2026-canvas]]`
- `every-days-2026-canvas`

If the marker is missing, the viewer falls back to rendering above the Notion content.

### When To Redeploy vs Revalidate
- Notion-only text/layout edits:
  - use the revalidation endpoint
  - no redeploy needed
- Changes to:
  - `public/data/collection-2026.json`
  - `components/EveryDays2026Viewer.tsx`
  - `components/SitePage.tsx`
  - sketch-loading logic or scripts
  - redeploy required

### Local Secret Convenience
Store your revalidate secret in a local ignored file `.secret`:
```text
YOUR_SECRET_VALUE
```

PowerShell usage:
```powershell
$env:REVALIDATE_SECRET = (Get-Content .secret -Raw).Trim()
curl.exe -X POST https://www.aex.design/api/notion-revalidate `
  -H "x-revalidate-secret: $env:REVALIDATE_SECRET"
```

### Troubleshooting
- `{"ok":false,"error":"NOTION_REVALIDATE_SECRET is not configured."}`
  - `NOTION_REVALIDATE_SECRET` is missing in Vercel env or deployment has not been redeployed yet.
- `{"ok":false,"error":"Unauthorized."}`
  - Header secret does not match `NOTION_REVALIDATE_SECRET`.
- Notion pages returning unauthorized/404 after env updates:
  - Verify `NOTION_TOKEN` is valid and separate from `NOTION_REVALIDATE_SECRET`.

## Local Development
```bash
npm install
npm run dev
```

Other commands:
- `npm run typecheck`
- `npm run build`
- `npm run start`
- `npm run sync:collection-2026 -- <id>`

Check `/every-days` locally:
```bash
npm run dev
```

Then open:
```text
http://localhost:3000/every-days
```

## Deployment
- Standard flow: push `main` to GitHub; Vercel auto-deploys.
- Manual production deploy (CLI):
```bash
npx vercel --prod --yes
```

Recommended release flow for `/every-days` updates:
```bash
npm run typecheck
npm run build
git add .
git commit -m "Update every-days 2026 viewer"
git push origin main
```

If you need to force production deploy after push:
```bash
npx vercel --prod --yes
```

## Notes
- Avoid committing secrets.
- `NOTION_TOKEN` and `NOTION_REVALIDATE_SECRET` must remain private.
- Hidden tester pages ending with `-type-tester` are intentionally excluded from child-page navigation.
