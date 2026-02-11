# aexdesigns

Public website built with Next.js and Notion as the CMS layer.

## Project Overview
- Runtime: Next.js App Router with TypeScript
- Content source: Notion API via `@notionhq/client`
- Hosting target: Vercel
- Primary behavior: dynamic page rendering from Notion routes and blocks

## Architecture
- `lib/notion.ts` handles route resolution, page fetch, block fetch, and normalization.
- `app/page.tsx` serves `/` from Notion data.
- `app/[...slug]/page.tsx` serves dynamic routes and static params generation.
- `components/NotionRenderer.tsx` renders Notion blocks into local UI components.
- `components/TypeTester.tsx` provides the native type tester experience.
- `components/SitePage.tsx` provides page shell and page-specific top actions.
- `app/globals.css` contains local global styles and component-level class styling.

## Routing and Content Model
- Supports database-driven route publishing through Notion properties.
- Supports static slug mapping through `content/route-map.json`.
- Hidden tester routes (`-type-tester`) are excluded from child-page navigation output.
- Type tester placement is marker-driven from Notion paragraph content.

## Runtime Characteristics
- Server-side route/page helpers are memoized with React `cache`.
- Additional TTL memory cache is applied for route/page payloads (`NOTION_CACHE_TTL_SECONDS`).
- Nested block fetch is parallelized with bounded concurrency for deep page trees.
- Internal navigation is wired through Next.js `Link` for client-side transitions.

## Technical Configuration Surface
- Environment variables used by runtime:
  - `NOTION_TOKEN`
  - `NOTION_DATABASE_ID`
  - `NOTION_HOME_PAGE_ID`
  - `NOTION_SLUG_PROPERTY`
  - `NOTION_PUBLISHED_PROPERTY`
  - `NOTION_DESCRIPTION_PROPERTY`
  - `NOTION_CACHE_TTL_SECONDS`
  - `SITE_URL`

## Basic Operations
- Install dependencies: `npm install`
- Set runtime env values in `.env.local` (minimum: `NOTION_TOKEN`, `SITE_URL`)
- Run development server: `npm run dev`
- Run type checks: `npm run typecheck`
- Build production bundle: `npm run build`
- Run production server: `npm run start`
