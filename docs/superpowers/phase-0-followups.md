# Phase 0 — follow-ups and untested assumptions

Written 2026-10-28 at the end of the Phase 0 build (branch `phase-0-demo-shell`). Source: the per-task and final reviews. Nothing here blocks the demo; it is the backlog of known gaps.

## Must verify first when the cloud accounts exist (nothing below could be run without them)
1. **Supabase JWT mode:** new projects sign with asymmetric keys (JWKS, leave `SUPABASE_JWT_SECRET` unset); legacy projects use HS256 and need the secret. Wrong choice ⇒ every API call is 401 (the app now signs the user out with a message instead of looping). Confirm `iss` = `<SUPABASE_URL>/auth/v1`, `aud` = `authenticated`.
2. **Supabase settings:** Confirm email OFF, min password 12, `signUp` on an existing email returns `user_already_exists`, redirect URLs include `<WEB_URL>/auth/callback`, Google PKCE cookie survives on the Vercel domain.
3. **Seed against real Supabase/Neon:** `SupabaseAuthAdmin` (create / already-exists / `app_metadata.seeded`) has only been tested against a fake client; run `db:migrate` + `seed` twice and expect the same report. Use Neon's DIRECT URL for migrations (`DATABASE_URL_DIRECT`).
4. **Concurrency on real Postgres:** run `me.e2e-spec.ts` (parallel first-login) and the entitlement concurrency test once with `TEST_DATABASE_URL` pointing at a throw-away Neon branch (PGlite serialises transactions, so it never hits the ON CONFLICT race).
5. **Render:** the Dockerfile was never built (no Docker here). Check the Blueprint path `apps/api/render.yaml`, `pnpm install --frozen-lockfile --filter @upsc/api...` without `apps/web`, `PORT`, free-tier build time vs smoke's 90 s wait, cold start (~60 s).
6. **Vercel:** Root Directory / pnpm detection when deploying from `apps/web`; `API_ORIGIN` and `NEXT_PUBLIC_*` must be set before the build (rewrites are fixed at build time); rewrite timeout vs Render cold start (no `loading.tsx`, `serverApi('/me')` has no timeout); middleware calls Supabase `getUser()` on every request incl. prefetches (watch rate limits; 3 s fail-closed timeout).
7. **Visual check against Figma** of the shell, Home, Learn, login/signup — no signed-in session was available during the build.

## Deferred minors (by area)
**API**
- `loadConfig`: `PORT` NaN not validated; `webOrigin`/`demoPassword` are reserved/dead config.
- Token verifier: JWKS fetch failure is reported as 401 (should be 503); `@Roles` fails open if `RolesGuard` isn't also applied (always `@UseGuards(AuthGuard, RolesGuard)`); `users.status` is not enforced by `AuthGuard` (needed when restricted/deleted users exist).
- Email-sync clash check→update race could 500 (catch 23505).
- DB: `rejectUnauthorized:false` for Neon SSL (use `ssl: true` once verified); error filter logs full stacks for unknown errors (Drizzle errors may contain emails — PII in logs); health returns 200 with `db:'down'`.
- Entitlements: subscribed-plan-without-row falls through to default plan; only `status='active'` subscriptions count (trialing/past_due → free; several actives → highest id); `usage()` is ~50 queries (batch); invalid `users.timezone` ⇒ RangeError 500; missing indexes on `subscriptions(user_id)`, `entitlement_overrides(user_id, feature_key)`, single-default-plan unique index; add an e2e assertion that the 429 body carries `resetsAt`.
- Catalog: join also requires `a.status='published'` (untested); no tests for zero-module subject and ordering; raw SQL hard-codes names.
- Seed: only the two fixed `@example.com` users are touched; plans/subjects with the same key but a different id would raise a unique violation; `seed-data` path is ts-node-only (image doesn't include the seed).
- Admin API: no test for DB role change with the same token, upper-limit clamp, ≤2 queries for plans.
- Test infra: `test/db.ts` schema drop-list is hard-coded (add new schemas); PGlite boots slowly under load (jest capped at 2 workers); `TEST_DATABASE_URL` mode never exercised.

**Web**
- `apiFetch`: 2xx non-204 with empty/non-JSON body throws a raw SyntaxError; client constructor/getSession can throw when env is missing; tests lack 204 / rejected fetch / Content-Type / `serverApi` 401 cases; `ApiError`+`parseResponse` live in a file that imports the browser Supabase client.
- Auth screens: Google button handler has no try/catch/pending; middleware timeout timer is never cleared; `safeReturnTo` doesn't resolve dot-segments (harmless today); signup page has no tests; `/auth/signout` GET uses the default global scope (low-impact cross-site logout) and a voluntary log-out shows the "couldn't verify your session" message.
- Shell: closed mobile drawer stays in the tab order, no focus return; `AskAiPanel` has `aria-modal` without a focus trap; user menu has no arrow-key navigation; no `focus-visible` styles on top-bar controls; literal `white/5` colours in `Sidebar`/`AdminNav`; test gaps (AskAiPanel Escape/backdrop/focus, exact phase values, nested active path).
- Home/Learn: "Resume" span looks like a CTA on sample cards; no home page test; "2 of 5 complete" with 3 tasks listed (sample).
- Admin: no mobile navigation; null limit shows "Unlimited" for enabled boolean features; `return_to` after login is always `/admin`; users table hard-codes Asia/Kolkata.
- Favicon is still the create-next-app default.

**Deployment**
- `deploy.sh`: smoke runs right after the Render hook so it can pass against the OLD build — add a version check or longer wait; `--dry-run` still requires all env vars; secrets appear in `ps` argv (acceptable on a dev machine); smoke test script mode 644 and its stub doesn't check the password.

## Rulings made during the build
See `docs/superpowers/phase-0-rulings.md`.
