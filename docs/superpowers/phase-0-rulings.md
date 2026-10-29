# Phase 0 — rulings the controller made on the owner's behalf

1. Repo initialised on `main` with a docs-only commit; work happened on branch `phase-0-demo-shell`. Task 1 skipped `git init`. *Cost if wrong: trivial.*
2. Local Node is 20.17 (plan says 22): `engines >=20`, `.nvmrc` 22 and the Dockerfile use Node 22. *Cost: a Node-22-only incompatibility would surface at deploy.*
3. pnpm installed without sudo (corepack failed; `npm i -g pnpm@9 --prefix ~/.local`). *Cost: minutes.*
4. Steps needing real Neon/Supabase accounts (seed run, live health through the proxy with a real DB, real login, deploy) were not run; dummy env was used where a manual check was possible. *Cost: late discovery of integration bugs — see follow-ups list.*
5. Docker isn't installed: the image build was simulated step by step, never built.
6. API returns 409 `email_conflict` when an email belongs to a different auth subject, and rejects tokens without an email (safe consequence of unique `lower(email)`; linking by email would allow account takeover). *Cost: a user recreated in Supabase with the same email is locked out until the DB row is fixed.*
7. Real Figma variables (`docs/specs/figma/TOKENS.md`) were used for design tokens instead of the screenshot approximations; Tailwind v4 (tokens via `@theme`).
8. Middleware lives at `apps/web/src/middleware.ts` (Next ignores a root file in a `src/` project).
9. Not fixed after the final review: `return_to` dropped on API-401 (layout can't know the path), smoke-vs-old-build race, `rejectUnauthorized:false`, PII in error logs, `users.status` enforcement, concurrency tests on real Postgres. *Cost: see follow-ups.*
