# AEX Site Migration Rules

Last updated: 2026-02-10

This file is the source of truth for ongoing migration work.

## Goals
- Keep Notion as the CMS.
- Host and deploy on Vercel/Next.js.
- Remove all Super.so dependency and lock-in.
- Match current live design, page by page.

## Hard Rules
- Do not use Super.so URLs, scripts, CSS, fonts, or hosted assets.
- Do not reintroduce `public/styles/static.css`, `public/styles/notion.css`, or `public/styles/super.css`.
- Use neutral naming in code/CSS. Use `site-*` classes, not `super-*`.
- Keep logo local: `/public/assets/logo.svg`.
- Keep favicon local (currently set to `/assets/logo.svg` until replaced).
- Fonts must be local or standard provider (Google fonts is allowed).
- If any missing design asset is needed, ask before guessing.

## Current Implementation Decisions
- Layout and styling are local in `app/globals.css`.
- Font is `Space Mono` via `next/font/google` in `app/layout.tsx`.
- Navbar classes use `site-*` naming in `components/SiteNav.tsx`.
- Page wrapper uses `site-content` in `components/SitePage.tsx`.
- Homepage/page content comes from Notion blocks rendered by `components/NotionRenderer.tsx`.
- `child_page` blocks are rendered as real page links (`.notion-page`), not manual hardcoded links.
- `-type-tester` routes are hidden from child-page navigation render.

## Content + Notion Rules
- Notion remains the editing source for pages.
- Keep using route mapping in `content/route-map.json` for stable slug mapping.
- Keep hidden/incomplete pages unpublished via Notion publish controls or naming rules.
- Avoid old Super workaround patterns that hide all Notion page links and replace with manual links.

## Visual Rules (Current)
- Dark theme base is black background + white text.
- Notion page icons are hidden on listing links.
- Link/page hover uses subtle border + opacity behavior.
- Toggle summary labels are hidden (for the current homepage behavior).

## Runtime Notes
- The small Next.js dev indicator appears in local `next dev`.
- That dev indicator is not shown in production (`next build` + Vercel deploy).

## If Continuing This Migration
- Work page-by-page.
- Preserve these rules unless explicitly changed by the owner.
- If a change conflicts with this file, pause and confirm before implementing.
