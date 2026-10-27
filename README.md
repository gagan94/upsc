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

## Docs

Product and engineering specs: [docs/specs/README.md](docs/specs/README.md)
