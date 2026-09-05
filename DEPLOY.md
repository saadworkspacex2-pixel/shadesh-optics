# Deploying SHADESH.OPTICS.Dhaka

The app builds cleanly with **no environment variables present** (verified), so any
build failures you saw previously were caused by the database connection being
opened at import time — that is now lazy and build-safe.

## Required environment variable

Set this in your host's dashboard **before first deploy** (one is enough to run):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require` | Your Neon connection string |

Optional:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical domain (used in sitemap/robots/OG tags), e.g. `https://shadeshoptics.com` |
| `ADMIN_SECRET` | Custom secret for admin session signing |

> **Troubleshooting tip:** if you see database authentication errors mentioning
> "channel binding" on your host, remove `&channel_binding=require` from the
> connection string (Neon accepts it over `sslmode=require` as well).

## Vercel

1. Push this repo to GitHub/GitLab (the `.gitignore` already excludes `.env` — never commit it).
2. In Vercel → *New Project* → import the repo. Framework preset **Next.js** is auto-detected; no custom build settings needed.
3. Add `DATABASE_URL` under *Settings → Environment Variables* (Production + Preview), then redeploy.
4. Add your custom domain under *Settings → Domains*.

## Netlify

1. Push the repo; Netlify auto-installs `@netlify/plugin-nextjs` for Next 16.
2. Build command: `next build` (default). No publish dir override needed — the runtime handles it.
3. Add `DATABASE_URL` under *Site settings → Environment variables*, then trigger a redeploy.

## Database schema

## First run on a fresh database

```bash
npx drizzle-kit push --force   # create tables
npx tsx scripts/seed.ts        # admin account + default settings (no sample data)
```

Then log in at `/admin` with the seeded credentials and change the password if desired.

## Files that matter for deployment

- `src/db/index.ts` — lazy, build-safe Postgres pool (do not revert to eager init)
- `drizzle.config.json` — schema/config for `drizzle-kit push`
- `.gitignore` — keeps secrets out of git
