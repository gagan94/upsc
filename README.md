# AI UPSC

UPSC exam-preparation platform. Monorepo with `apps/api` (NestJS) and `apps/web` (Next.js).

## Prerequisites

- Node.js 22 (see `.nvmrc`; Node >= 20 works locally)
- pnpm 9 (`npm i -g pnpm@9`)

## Setup

```sh
cp .env.example .env   # then fill in values
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Testing

`pnpm test` runs the API tests against an in-process PGlite database (no setup needed).

To run them against real Postgres instead, set `TEST_DATABASE_URL`. It must point at a
throw-away database or branch: the `identity`, `billing`, `catalog` and `drizzle` schemas are
DROPPED and recreated on every `createTestDb()` call. Jest then runs serially (`maxWorkers: 1`).

## Deploying the demo

Free-tier stack: Neon (Postgres), Supabase (auth), Render (API, Docker), Vercel (web).
Full runbook: [docs/demo/phase-0.md](docs/demo/phase-0.md).

One-time owner setup checklist:

- [ ] Supabase project: Confirm email OFF, minimum password length 12, redirect URLs, copy URL, `anon` and `service_role` keys
- [ ] Neon project: copy the pooled connection string as `DATABASE_URL`
- [ ] Render: Blueprint from `apps/api/render.yaml`, set env vars, copy the Deploy Hook as `RENDER_DEPLOY_HOOK_URL`
- [ ] Vercel: `npx vercel link` in `apps/web`, set the `NEXT_PUBLIC_*` vars and `API_ORIGIN`
- [ ] Fill the deploy variables in `.env` (see `.env.example`), then run migrate and seed once

Daily deploy (tests, migrations, Render deploy hook, Vercel production deploy, smoke test):

```sh
set -a; source .env; set +a
./scripts/deploy.sh            # add --dry-run to print the steps only
```

## Docs

Product and engineering specs: [docs/specs/README.md](docs/specs/README.md)
