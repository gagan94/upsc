#!/usr/bin/env bash
# Daily demo deploy. Usage: ./scripts/deploy.sh [--dry-run]
# Order: tests -> migrate -> seed -> Render -> Vercel -> smoke. The seed is mandatory: feature keys
# (free-plan entitlements), practice catalog nodes and sample questions arrive only through it.
# Required env: DATABASE_URL, RENDER_DEPLOY_HOOK_URL, WEB_URL,
#               SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
# SUPABASE_SERVICE_ROLE_KEY is needed by the seed on THIS machine only; never set it on Render or Vercel.
# Stops at the first failure. Never prints secret values.
set -euo pipefail

DRY_RUN=0
case "${1:-}" in
  "") ;;
  --dry-run) DRY_RUN=1 ;;
  *) echo "usage: scripts/deploy.sh [--dry-run]" >&2; exit 2 ;;
esac

missing=()
for v in DATABASE_URL RENDER_DEPLOY_HOOK_URL WEB_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DEMO_PASSWORD; do
  [ -n "${!v:-}" ] || missing+=("$v")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "deploy: missing required env: ${missing[*]}" >&2
  exit 2
fi
# The seed refuses NODE_ENV=production; fail now rather than after the migrations ran.
if [ "${NODE_ENV:-}" = "production" ] && [ "${SEED_ALLOW_PRODUCTION:-}" != "true" ]; then
  echo "deploy: NODE_ENV=production is set; the seed step would refuse to run. Unset NODE_ENV for the deploy." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

step() {
  local n="$1" label="$2" shown="$3"
  shift 3
  echo "==> [$n/6] $label"
  if [ "$DRY_RUN" = "1" ]; then
    echo "    (dry run) $shown"
  else
    "$@"
  fi
}

run_tests() { pnpm --filter @upsc/api test -- --maxWorkers=2 && pnpm --filter @upsc/web test; }
trigger_render() { curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL" > /dev/null; }
deploy_web() { (cd apps/web && npx vercel deploy --prod --yes); }

step 1 "tests" "pnpm --filter @upsc/api test -- --maxWorkers=2 && pnpm --filter @upsc/web test" run_tests
step 2 "database migrations" "pnpm --filter @upsc/api db:migrate" pnpm --filter @upsc/api db:migrate
step 3 "seed demo data and feature keys" "pnpm --filter @upsc/api seed" pnpm --filter @upsc/api seed
step 4 "trigger Render API deploy" "curl -fsS -X POST <RENDER_DEPLOY_HOOK_URL>" trigger_render
step 5 "deploy web to Vercel" "cd apps/web && npx vercel deploy --prod --yes" deploy_web
step 6 "smoke test" "scripts/smoke.sh <WEB_URL>" "$ROOT/scripts/smoke.sh" "$WEB_URL"

if [ "$DRY_RUN" = "1" ]; then echo "DRY RUN DONE (nothing executed)"; else echo "DEPLOY DONE"; fi
