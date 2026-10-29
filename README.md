# AI UPSC

UPSC exam-preparation platform. Monorepo with `apps/api` (NestJS) and `apps/web` (Next.js).

## Prerequisites

- Node.js 22 (see `.nvmrc`; Node >= 20 works locally)
- pnpm 9 (`npm i -g pnpm@9`)

## Setup

```sh
pnpm install
pnpm setup:env   # creates .env from .env.example (if absent) and links apps/web/.env.local -> ../../.env
# fill in .env
pnpm dev
pnpm test
pnpm build
```

One root `.env` serves both apps: the API's `dev`, `start`, `db:migrate` and `seed` scripts load it
with `dotenv-cli` (variables already set in your shell win), and Next.js reads it through the
`apps/web/.env.local` symlink. Tests and builds never read `.env`; in production (Render) the API uses
real environment variables.

Values in `.env.example` are double-quoted so the file can be loaded into a shell even though Neon
URLs contain `&` and `?`. Load it with `set -a; . ./.env; set +a` (never a bare `source .env`, which
would not export the variables). Inside double quotes a literal `$` must be written as `\$`.

## Testing

`pnpm test` runs the API tests against an in-process PGlite database (no setup needed).
PGlite suites are heavy, so Jest is capped at 2 workers (`maxWorkers: 2` in `apps/api/jest.config.ts`).

To run them against real Postgres instead, set `TEST_DATABASE_URL`. It must point at a
throw-away database or branch: the `identity`, `billing`, `catalog` and `drizzle` schemas are
DROPPED and recreated on every `createTestDb()` call. Jest then runs serially (`maxWorkers: 1`).

## Deploying the demo

Free-tier stack: Neon (Postgres), Supabase (auth), Render (API, Docker), Vercel (web).
Full runbook: [docs/demo/phase-0.md](docs/demo/phase-0.md).

One-time owner setup checklist:

- [ ] Supabase project: Confirm email OFF, minimum password length 12, redirect URLs, copy URL, `anon` and `service_role` keys
- [ ] Neon project: copy the pooled connection string as `DATABASE_URL` and the direct (non-pooled) one as `DATABASE_URL_DIRECT` (used by `db:migrate`)
- [ ] Render: Blueprint with the Blueprint path set to `apps/api/render.yaml`, set env vars, copy the Deploy Hook as `RENDER_DEPLOY_HOOK_URL`
- [ ] Vercel: `npx vercel login` (or export `VERCEL_TOKEN`), then `npx vercel link` in `apps/web`, set the `NEXT_PUBLIC_*` vars and `API_ORIGIN`
- [ ] Fill the deploy variables in `.env` (see `.env.example`), then run migrate and seed once, BEFORE anyone signs up with the demo emails

Daily deploy (tests, migrations, Render deploy hook, Vercel production deploy, smoke test):

```sh
set -a; . ./.env; set +a
./scripts/deploy.sh            # add --dry-run to print the steps only
```

## Docs

Product and engineering specs: [docs/specs/README.md](docs/specs/README.md)
