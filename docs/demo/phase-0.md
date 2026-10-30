# Phase 0 demo runbook

> **Status: files written and locally verified; live deployment pending owner setup.**
> Not yet executed (no cloud accounts exist yet): Supabase/Neon/Render/Vercel setup, the real
> `db:migrate` and `seed`, the real `./scripts/deploy.sh`, the Docker image build (Docker was not
> available when this was written), and opening the live site. Treat every command below as
> untested against live services until this note is removed.

Stack: Neon (Postgres), Supabase (auth), Render free Docker web service (API), Vercel (web).

## 1. One-time owner setup

### Supabase
1. Create a project (region Mumbai if offered).
2. Authentication -> Providers -> Email: turn **Confirm email OFF** (demo only) and set **minimum password length 12**.
3. Settings -> API: copy the **Project URL** (`SUPABASE_URL`), the `anon` key (`SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and the `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`). The service role key stays on your machine only: never put it in Vercel or Render.
4. If the project uses a shared JWT secret, copy it as `SUPABASE_JWT_SECRET`. With asymmetric signing keys, leave it unset.
5. Authentication -> URL Configuration: Site URL = your Vercel URL; add `<WEB_URL>/auth/callback` and `http://localhost:3000/auth/callback` to the redirect URLs.

### Neon
Create a project and copy two connection strings:
- the **pooled** one (host contains `-pooler`) as `DATABASE_URL`: this is what the app uses (Render);
- the **direct** (non-pooled) one as `DATABASE_URL_DIRECT`: `db:migrate` prefers it when set, because
  migrations should not run through the pooler. Never put `DATABASE_URL_DIRECT` in Render.

### Render
1. New Blueprint (or Web Service). The Blueprint file is not at the repo root: set the **Blueprint path to `apps/api/render.yaml`**. Settings: free plan, Docker, health check `/api/v1/health`, auto-deploy off.
2. Set env vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (only if applicable), `WEB_ORIGIN` (the Vercel URL). `NODE_ENV=production` is in the blueprint.
3. Settings -> Deploy Hook: copy the URL as `RENDER_DEPLOY_HOOK_URL`.

### Vercel
1. Authenticate the CLI: `npx vercel login` (or export `VERCEL_TOKEN`, e.g. for non-interactive use).
2. `npx vercel link` inside `apps/web` (once).
3. Set project env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_ORIGIN` (the Render URL), `NEXT_PUBLIC_GOOGLE_ENABLED` (`false` until Google is set up).

### Google sign-in (optional)
Create a Google OAuth client; enable the Google provider in Supabase with its client id and secret, using Supabase's callback URL as the authorised redirect URI. Then set `NEXT_PUBLIC_GOOGLE_ENABLED=true` in Vercel and redeploy.

## 2. First run

Run `pnpm install && pnpm setup:env` (creates `.env` from `.env.example` and links
`apps/web/.env.local` to it), then fill in every value in `.env` (including `WEB_URL`,
`SUPABASE_ANON_KEY`, `DEMO_PASSWORD`; use a password of at least 12 characters). Local development
is then just `pnpm dev`.

Values in `.env` are double-quoted so the file loads in a shell even though Neon URLs contain `&`
and `?` (unquoted, `&` would background the assignment). Load it with `set -a; . ./.env; set +a`,
never a bare `source .env`. Inside double quotes write a literal `$` as `\$`.

> **First-run order matters.** Run `db:migrate` and `seed` BEFORE anyone signs up with
> `student@example.com` or `admin@example.com`. The seed only re-uses Supabase users it created
> itself; if it stops with "This Supabase user was not created by the seed", delete that user in the
> Supabase dashboard (Authentication -> Users) and run the seed again. Re-running the seed also
> resets the demo users' password to the current `DEMO_PASSWORD`.

```sh
set -a; . ./.env; set +a
pnpm --filter @upsc/api db:migrate  # uses DATABASE_URL_DIRECT when set, else DATABASE_URL
pnpm --filter @upsc/api seed        # safe to run twice
./scripts/deploy.sh                 # must end with SMOKE OK
```

The Docker image does not contain migrations or seed data: both always run from your machine.
Daily deploy is the same `./scripts/deploy.sh` (`--dry-run` prints the steps only). Its order is
**tests → migrate → seed → Render → Vercel → smoke**. The seed step is mandatory (since Phase 1 the
free plan's feature keys, the practice syllabus nodes and the sample questions arrive only through
it; without it practice and study sessions return 402 and the smoke test fails) and safe to repeat.
It needs `SUPABASE_SERVICE_ROLE_KEY` (and `DEMO_PASSWORD`) on the deploying machine only: never put
the service-role key in Render or Vercel. Run the deploy without `NODE_ENV=production` set (the seed
refuses it, and `deploy.sh` stops before step 1 if it is set).

### First live login: troubleshooting

If sign-in works in Supabase but the app sends you back to the login page with "We couldn't verify
your session. Please sign in again.", the API rejected the Supabase token (the web app now signs you
out with that message instead of looping between pages). Check, in the Render env vars:

- **JWT mode.** Projects using a legacy shared JWT secret (HS256) need `SUPABASE_JWT_SECRET`. New
  projects sign with asymmetric keys (JWKS): leave `SUPABASE_JWT_SECRET` unset, or every token fails.
- **Issuer.** `SUPABASE_URL` must be exactly the project URL (`https://<ref>.supabase.co`, no path):
  the token's `iss` must equal `<SUPABASE_URL>/auth/v1`.
- **Clock / JWKS reachability.** A large clock skew on the host, or the API being unable to fetch
  `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, also shows up as a rejected session.
- If the page instead says the server could not be reached, the API is down or still waking up
  (free tier): use "Try again"; "Log out" is always available on that panel.

## 3. The 10-minute demo script

1. **Sign up** a new account (12+ character password); you land in the app.
2. **Shell tour**: click through every sidebar item. Point out the "sample data" labels on stub pages.
3. **Learn**: open Learn; it lists the 8 seeded subjects.
4. **Ask AI**: open the Ask AI drawer (placeholder in Phase 0).
5. **Log out.**
6. **Log in as `admin@example.com`** (password `DEMO_PASSWORD`).
7. Open `/admin/users`, then `/admin/plans`.

## 4. Before every demo

- [ ] Open the site 2 minutes early to wake the API (free hosts sleep).
- [ ] Run `scripts/smoke.sh "$WEB_URL"` (with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DEMO_PASSWORD` set); expect `SMOKE OK`.
- [ ] Open the Supabase dashboard: a free project can pause after a week of inactivity; restore it if so.
- [ ] Know `DEMO_PASSWORD`.

## 5. Known limits

- Free-tier sleep: the first API request after idle can take up to a minute.
- No email confirmation (turned off for the demo) and no 2FA.
- Pages show sample data, clearly labelled as such.
- Google sign-in is optional and off until configured.
- Free Supabase projects pause after inactivity.
