# Phase 0 setup guide (step by step, for first-timers)

Companion to `phase-0.md` (the reference runbook). Follow this top to bottom; each part ends with a
**check** so you know it worked before moving on. Website buttons get renamed now and then: if a
label differs slightly, look for the closest match. Nothing here is verified against the live
sites yet; tell us where reality differs and we'll fix this file.

**You will end up with:** a local copy running on your laptop, then a public demo link.
**Time:** about 1.5 hours the first time. **Cost:** nothing (all free tiers; no card needed for
Supabase, Neon, Vercel Hobby; Render's free web service may ask for a card to verify identity).

**Safety rules (read once)**
- Keys and passwords go only into the local `.env` file (git ignores it) or into the hosting
  sites' settings pages. Never into chat, never into a commit.
- The Supabase `service_role` key is the most powerful one. It lives in your local `.env` only.
  Never paste it into Render or Vercel.
- Use a password manager or a notes file *outside* this project folder to collect values as you go.

---

## Part 0 — GitHub (Render needs your code on GitHub)

Render builds the API from a GitHub repository, so the code must be on GitHub first.

1. In a terminal inside the project folder, run (the `!` is only for Claude Code's prompt):
   `! gh repo create upsc --private --source=. --remote=origin`
2. Push both branches:
   `! git push -u origin main` then `! git push -u origin phase-0-demo-shell`
3. Open the repo page on github.com and confirm you see both branches.

**Check:** `git remote -v` shows `origin`, and the repo is marked **Private** on GitHub.

## Part 1 — Tools on your laptop

1. Node: run `node -v`. You need 20 or higher (22 preferred). If lower, install Node 22 from nodejs.org.
2. pnpm: run `pnpm -v`. If missing: `npm install -g pnpm@9`.
3. In the project folder: `pnpm install`.

**Check:** `pnpm install` finishes without red errors.

## Part 2 — Supabase (handles login)

1. Go to supabase.com → **Start your project** → sign in with GitHub.
2. **New project**. Name `upsc-demo`. Set a database password (save it; you won't need it again).
   Region: **Mumbai (ap-south-1)** if listed, else the nearest. Free plan. Create, then wait ~2 minutes.
3. Turn off email confirmation (demo only): left sidebar **Authentication → Sign In / Providers**
   (older UI: **Providers**) → **Email** → switch **Confirm email** OFF → set **Minimum password
   length** to **12** → Save.
4. Copy the keys: **Project Settings** (gear) → **API** (newer UI: **API Keys** and **Data API**).
   Collect:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`) → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** (newer UI may call it the *publishable* key) → `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (newer UI: *secret* key) → `SUPABASE_SERVICE_ROLE_KEY`. Click *Reveal*, copy. Keep private.
5. JWT mode (decides whether you need `SUPABASE_JWT_SECRET`): **Project Settings → JWT Keys**
   (or **API → JWT Settings**).
   - If the page shows a **Legacy JWT secret** that is in use → copy it as `SUPABASE_JWT_SECRET`.
   - If the project uses new **signing keys (asymmetric / JWKS)** → leave `SUPABASE_JWT_SECRET` empty.
   - Not sure? Leave it empty first; if login later says "We couldn't verify your session", come back and set it.
6. URL settings come *after* you have the Vercel link (Part 6). Skip for now.

**Check:** you have 4 values: URL, anon key, service_role key, (optional) JWT secret.

## Part 3 — Neon (the database)

1. Go to neon.tech → sign up (GitHub is fine) → **Create project**. Name `upsc-demo`, Postgres 16,
   region closest to you (AWS Singapore `ap-southeast-1` is closest to India on the free plan).
2. On the project dashboard click **Connect** (top right). You'll see a connection string with a
   **Connection pooling** toggle.
   - Toggle **ON** → copy → this is `DATABASE_URL` (host contains `-pooler`).
   - Toggle **OFF** → copy → this is `DATABASE_URL_DIRECT`.
3. Each string starts `postgresql://user:password@host/dbname?sslmode=require`. Copy the whole line.

**Check:** two strings, one with `-pooler` in the host, one without.

## Part 4 — Fill `.env` and run it locally

1. In the project folder: `pnpm setup:env`. This creates `.env` and links it for the web app.
2. Open `.env` in an editor and fill every value **between the quotes** (keep the quotes):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled string |
   | `DATABASE_URL_DIRECT` | Neon direct string |
   | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | Project URL (same in both) |
   | `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (same in both) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `SUPABASE_JWT_SECRET` | only if Part 2 step 5 said so, else leave `""` |
   | `DEMO_PASSWORD` | a password you choose, 12+ characters; it becomes the password of the seeded demo users |
   | `WEB_URL`, `RENDER_DEPLOY_HOOK_URL` | leave for later (Parts 5–6) |
   Leave the other keys as they are (`PORT`, `API_ORIGIN`, `WEB_ORIGIN` already suit local use).
3. Create tables and demo data. **Do this before signing up anywhere** (the seed creates the
   `student@example.com` and `admin@example.com` demo users):
   ```sh
   set -a; . ./.env; set +a
   pnpm --filter @upsc/api db:migrate
   pnpm --filter @upsc/api seed
   ```
   Expect the seed to print counts such as `subjects 8, modules 12, lessons 15`.
4. Start the app: `pnpm dev`. Open http://localhost:3000.
5. Log in as `student@example.com` with your `DEMO_PASSWORD`. Click around; open **Learn** (8 subjects).
   Log out, log in as `admin@example.com`, open http://localhost:3000/admin/users.

**Check:** both logins work locally and `/admin/users` lists users.
**If it fails:** a "We couldn't verify your session" message → Part 2 step 5 (JWT mode). A seed
message "not created by the seed" → delete that user under Supabase **Authentication → Users**, rerun
the seed. Anything else: copy the exact error text to Claude (without any keys).

## Part 5 — Render (the API)

1. render.com → sign up with GitHub → grant access to the `upsc` repo when asked.
2. **New + → Blueprint** → pick the `upsc` repo → branch `phase-0-demo-shell` (or `main` after the
   PR merges) → **Blueprint Path: `apps/api/render.yaml`** → continue.
3. Render lists the service `upsc-api` (Free, Docker). It asks for the secret env vars:
   - `DATABASE_URL` → the Neon **pooled** string
   - `SUPABASE_URL` → Project URL
   - `SUPABASE_JWT_SECRET` → value or leave empty (same rule as Part 2)
   - `WEB_ORIGIN` → type `http://localhost:3000` for now; you'll change it in Part 6
   Create. The first build takes ~5–10 minutes.
4. When it says **Live**, open `https://<your-service>.onrender.com/api/v1/health` — it should
   return a small JSON "ok". Copy that base URL (without `/api/v1/health`); it is your `API_ORIGIN`
   for Vercel.
5. Service → **Settings → Deploy Hook** → copy the URL → paste into local `.env` as
   `RENDER_DEPLOY_HOOK_URL`. (Anyone with this URL can trigger a deploy: keep it private.)

**Check:** the health URL answers. (The free service sleeps when idle: first request after a break
takes up to a minute.)

## Part 6 — Vercel (the website)

1. vercel.com → sign up with GitHub (Hobby plan, free).
2. In the project folder: `cd apps/web && npx vercel login` (follow the browser prompt), then
   `npx vercel link` → answer: set up? **yes**; scope: your account; link to existing project?
   **no**; project name `upsc-web`; directory `./`. Then `cd ../..`.
3. Add the environment variables in the Vercel dashboard (project → **Settings → Environment
   Variables**, environment **Production**):
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
   - `API_ORIGIN` = the Render base URL from Part 5 (no trailing slash)
   - `NEXT_PUBLIC_GOOGLE_ENABLED` = `false`
4. Deploy once: `cd apps/web && npx vercel deploy --prod --yes`. It prints the production URL
   (like `https://upsc-web.vercel.app`). Put it in local `.env` as `WEB_URL`.
5. Back on **Render → upsc-api → Environment**: change `WEB_ORIGIN` to the Vercel URL → save.
6. Back on **Supabase → Authentication → URL Configuration**: Site URL = the Vercel URL; add
   Redirect URLs `<Vercel URL>/auth/callback` and `http://localhost:3000/auth/callback`; Save.

**Check:** open the Vercel URL; you see the login page.

## Part 7 — Your daily deploy

1. In the project folder: `set -a; . ./.env; set +a` then `./scripts/deploy.sh --dry-run`
   (prints the 5 steps, runs nothing).
2. Real run: `./scripts/deploy.sh`. It tests, migrates the database, triggers Render, deploys
   Vercel, then runs the smoke test. Success ends with `DEPLOY DONE` (and `SMOKE OK` above it).
3. Before a stakeholder demo, open the site 2 minutes early (wakes the API) and follow the
   "Before every demo" list in `phase-0.md`.

## Quick glossary
- **Env var**: a named setting (like a key or URL) given to the program, kept out of the code.
- **Pooled vs direct connection**: pooled is for the running app; direct is for one-off tasks like migrations.
- **Seed**: a script that loads the dummy demo data.
- **Smoke test**: a quick automated check that the live site's basics work.
