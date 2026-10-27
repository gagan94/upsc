# API image for Render (free Docker web service). Build context is the repo root:
#   docker build -f apps/api/Dockerfile .
#
# The image contains only the compiled API and its production dependencies.
# It does NOT include seed-data/, the seed CLI or the SQL migrations: run
# `db:migrate` and `seed` from the owner's machine (see docs/demo/phase-0.md).

FROM node:22-slim AS build
WORKDIR /repo
RUN npm i -g pnpm@9.15.9
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
# apps/web is not part of this image; its manifest is not copied, so the
# filtered install below only needs the api importer.
RUN pnpm install --frozen-lockfile --filter @upsc/api...
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN pnpm --filter @upsc/api build \
 && pnpm --filter @upsc/api deploy --prod /out \
 && cd /out && rm -rf src test seed-data drizzle drizzle.config.ts jest.config.ts tsconfig.json tsconfig.build.json

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
USER node
# Render injects PORT; the app reads it (default 4000 for local runs).
EXPOSE 4000
CMD ["node", "dist/main.js"]
