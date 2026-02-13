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
curl.exe -X POST https://aexdesigns.vercel.app/api/notion-revalidate `
  -H "x-revalidate-secret: YOUR_SECRET" `
  -H "content-type: application/json" `
  -d "{\"slug\":\"/typecheck\"}"
```

Full-site refresh:
```powershell
curl.exe -X POST https://aexdesigns.vercel.app/api/notion-revalidate `
  -H "x-revalidate-secret: YOUR_SECRET"
```

The endpoint clears runtime Notion cache and triggers ISR path revalidation.

### Local Secret Convenience
Store your revalidate secret in a local ignored file `.secret`:
```text
YOUR_SECRET_VALUE
```

PowerShell usage:
```powershell
$env:REVALIDATE_SECRET = (Get-Content .secret -Raw).Trim()
curl.exe -X POST https://aexdesigns.vercel.app/api/notion-revalidate `
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

## Deployment
- Standard flow: push `main` to GitHub; Vercel auto-deploys.
- Manual production deploy (CLI):
```bash
npx vercel --prod --yes
```

## Notes
- Avoid committing secrets.
- `NOTION_TOKEN` and `NOTION_REVALIDATE_SECRET` must remain private.
- Hidden tester pages ending with `-type-tester` are intentionally excluded from child-page navigation.
