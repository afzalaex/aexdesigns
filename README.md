# Aex Site (Notion + Vercel)

This project replaces Super.so while keeping Notion as your CMS.

## What you edit after migration
- Edit existing page content directly in Notion.
- Create new pages in Notion.
- Publish/unpublish by changing a property (database mode) or adding/removing entries in `content/route-map.json` (map mode).

## Tech
- Next.js App Router
- Notion API (`@notionhq/client`)
- Vercel hosting

## Prerequisites
- Node.js 20+
- A Notion integration token
- Your Notion pages shared with that integration

## Setup
1. Install dependencies:
   - `npm install`
2. Create local env:
   - Copy `.env.example` to `.env.local`
   - Fill `NOTION_TOKEN`
3. Choose route source:
   - Database mode (recommended for no-code publishing)
   - Route map mode (direct slug -> page ID mapping)

## Database Mode (recommended)
Set `NOTION_DATABASE_ID` and keep these properties in your Notion database:
- `Title` (title)
- `Slug` (rich text or text-like property)
- `Published` (checkbox)
- `Description` (optional rich text)

Workflow:
- New page: create a row, set `Slug`, set `Published = true`.
- Edit page: edit row page content in Notion.
- Unpublish: set `Published = false`.

## Route Map Mode
Use `content/route-map.json` entries:
- `slug`: URL path (example: `/archive/craft`)
- `pageId`: Notion page ID

Route map helper from live sitemap:
- `npm run seed:route-map`
- Default source: `https://aex.design/sitemap.xml`

Auto-fill `pageId` values from current live site:
- `npm run fill:route-map-live`
- Optional custom site + file:
  - `node scripts/fill-route-map-from-live-site.mjs <site-url> <route-map-file>`

With custom source/output:
- `node scripts/seed-route-map-from-sitemap.mjs <sitemap-url> <output-file>`

How to get a Notion page ID:
- Open page in Notion.
- Copy the 32-char ID from the URL tail.
- Paste as `pageId` (hyphens optional).

Home page setup:
- Add `/` in route map, or
- set `NOTION_HOME_PAGE_ID`.

## Run locally
- `npm run dev`
- Open `http://localhost:3000`

## Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add env vars in Vercel Project Settings:
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID` (if using database mode)
   - `NOTION_HOME_PAGE_ID` (optional)
   - `NOTION_SLUG_PROPERTY` (optional)
   - `NOTION_PUBLISHED_PROPERTY` (optional)
   - `NOTION_DESCRIPTION_PROPERTY` (optional)
   - `SITE_URL` (set to `https://aex.design`)
4. Deploy preview.
5. Verify URLs.
6. Point `aex.design` to this Vercel project.
7. Cancel Super after cutover validation.

## Notes
- This starter renders common Notion block types (headings, paragraph, lists, quote, image, code, callout, toggle, to-do, embed/bookmark links).
- If you use advanced Notion blocks heavily, we can add support incrementally.
