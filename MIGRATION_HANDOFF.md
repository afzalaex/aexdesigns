# Aex Site Migration Handoff

Last updated: 2026-02-11
Project path: C:\Users\AMD\projects\aex-site

## Read this first
- Follow `MIGRATION_RULES.md` as the source of truth for implementation rules.

## Current status
- Next.js + TypeScript base is working.
- Notion API integration is active.
- Dynamic routes are active (`/` and `/<slug>`).
- `content/route-map.json` maps slugs to Notion page IDs.
- `child_page` blocks are rendered as real Notion page links.
- `-type-tester` routes are hidden from child-page navigation output.
- Super-hosted CSS and Super CDN dependencies have been removed.
- Class naming is now neutral (`site-*`, no `super-*` classes in app/components).
- Homepage is visually tuned and currently accepted as baseline.
- Internal site navigation now uses Next.js `Link` (client-side routing) for homepage logo, child pages, and internal rich-text links.
- Notion block loading is now concurrent (bounded worker pool) to reduce deep-page fetch latency.
- Runtime TTL cache was added for routes/pages in `lib/notion.ts` (default `60s`, configurable via `NOTION_CACHE_TTL_SECONDS`).
- Top-action links/buttons are implemented for:
  - `/p5nels`
  - `/typecheck`
  - `/nounty`
  - `/aexpective`
  - `/designassetpack2`
  - `/aextract`
  - `/aextract36`
  - `/designassetpack1`
- Top actions are fixed top-right and hidden only under `max-width: 300px`.

## Type Tester System (No Super Dependence)
- Native `TypeTester` component is now used (not Super tester pages).
- Current tester UX:
  - editable `contentEditable` typing surface (no textarea resize handle)
  - slider at top inside box (`min 10`, `max 100`)
  - idle opacity effect, full opacity on active/focus
  - no focus border effect
  - `TypeTester` label inside box at bottom-center
- Tester marker placement is implemented in `NotionRenderer`.
  - Add a paragraph block in Notion at the exact desired position with one of:
    - `type tester`
    - `type tester:aextract`
    - `type tester:typecheck`
    - `type tester:nounty|Custom Caption` (caption currently ignored in UI)
    - `{{tester:aextract}}`
    - `[[tester:aextract36]]`
- Default tester mapping for plain `type tester`:
  - `/typecheck` -> TypeCheck
  - `/aextract` -> Aextract
  - `/aextract36` -> AEXTRACT36
  - `/nounty` -> Nounty
  - `/aexpective` -> AEXPECTIVE
- Legacy embed-based tester mapping still exists in code for compatibility, but no longer required for placement.

## Important files
- `MIGRATION_RULES.md` (hard rules and decisions)
- `MIGRATION_HANDOFF.md` (this status file)
- `README.md` (setup and deploy flow)
- `content/route-map.json` (slug -> pageId map)
- `lib/notion.ts` (Notion data layer)
- `components/NotionRenderer.tsx` (block rendering)
- `components/TypeTester.tsx` (native tester UI)
- `components/SitePage.tsx` (page shell + per-page top actions)
- `components/SiteNav.tsx` (logo link to home)
- `app/globals.css` (site styles)

## Build/test state
- `npm run typecheck` passes.
- `npm run build` currently times out in this environment while waiting on live Notion/static generation; no code-level build error observed.
- Build-hardening is intentionally paused until page-by-page design work is done.

## Notion verification snapshot (latest check)
- `/typecheck`: embeds=0, markers=1
- `/aextract`: embeds=0, markers=1
- `/aextract36`: embeds=0, markers=1
- `/nounty`: embeds=0, markers=1
- `/aexpective`: embeds=0, markers=1
- `/8inary`: embeds=0, markers=0
- `/8inary` code-side auto tester injection has been removed.

## Next steps when resuming
1. Set env in `.env.local`.
2. Run `npm run dev`.
3. Continue page-by-page visual matching and replace any remaining tester placements with marker paragraphs.
4. Remove any leftover non-marker placeholder content from `/8inary` if still present in Notion.
5. After all key pages match, run build-readiness pass (`npm run build`) and fix blockers.
6. Final QA and Vercel cutover after content is stable.

## Notes
- Do not share `NOTION_TOKEN` in chat.
- Keep following `MIGRATION_RULES.md` for no-Super dependency policy.
