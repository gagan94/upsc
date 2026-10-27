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

## Docs

Product and engineering specs: [docs/specs/README.md](docs/specs/README.md)
