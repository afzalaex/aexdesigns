# aexdesigns

Public website powered by Next.js and Notion content.

## Summary
- Framework: Next.js (App Router) + TypeScript
- CMS: Notion API (`@notionhq/client`)
- Hosting target: Vercel
- Routing: dynamic pages from Notion (database mode or static route map)

## Quick Start
1. Install dependencies:
   - `npm install`
2. Create a local env file:
   - `.env.local`
3. Add required values:
   - `NOTION_TOKEN`
   - `SITE_URL` (for local use `http://localhost:3000`, for prod use your domain)
4. Start dev server:
   - `npm run dev`
5. Open:
   - `http://localhost:3000`

## Common Scripts
- `npm run dev` - run local dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run typecheck` - TypeScript check
- `npm run seed:route-map` - seed route map from sitemap
- `npm run fill:route-map-live` - fill route map page IDs from live site

## Env Variables
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID` (optional, database mode)
- `NOTION_HOME_PAGE_ID` (optional)
- `NOTION_SLUG_PROPERTY` (optional, default `Slug`)
- `NOTION_PUBLISHED_PROPERTY` (optional, default `Published`)
- `NOTION_DESCRIPTION_PROPERTY` (optional, default `Description`)
- `NOTION_CACHE_TTL_SECONDS` (optional, default `60`)
- `SITE_URL`

## Deploy
1. Push to GitHub.
2. Import repo in Vercel.
3. Set env vars in Vercel.
4. Deploy.
