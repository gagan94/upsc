#!/usr/bin/env bash
# Checks scripts/deploy.sh in --dry-run mode only (nothing is executed). Usage: bash scripts/test/deploy.test.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY="$DIR/../deploy.sh"
FAILS=0

ENV_OK=(
  DATABASE_URL=postgres://u:SECRET-db@h/db
  RENDER_DEPLOY_HOOK_URL=https://hook.invalid/SECRET-hook
  WEB_URL=https://web.invalid
  SUPABASE_URL=https://sb.invalid
  SUPABASE_ANON_KEY=SECRET-anon
  SUPABASE_SERVICE_ROLE_KEY=SECRET-service
  DEMO_PASSWORD=SECRET-demo
)

ok() { echo "PASS $1"; }
bad() { echo "FAIL $1"; FAILS=$((FAILS + 1)); }

# 1. dry run prints six steps in order: tests, migrate, seed, Render, Vercel, smoke.
out="$(env -i PATH="$PATH" HOME="$HOME" "${ENV_OK[@]}" bash "$DEPLOY" --dry-run 2>&1)"; rc=$?
[ "$rc" = 0 ] && ok "dry run exits 0" || bad "dry run exits 0 (rc=$rc)"
steps="$(printf '%s\n' "$out" | grep '^==> ' | tr '\n' '|')"
want='==> [1/6] tests|==> [2/6] database migrations|==> [3/6] seed demo data and feature keys|==> [4/6] trigger Render API deploy|==> [5/6] deploy web to Vercel|==> [6/6] smoke test|'
[ "$steps" = "$want" ] && ok "steps: migrate -> seed -> Render -> Vercel -> smoke" || bad "steps were: $steps"
printf '%s\n' "$out" | grep -q '(dry run) pnpm --filter @upsc/api seed$' && ok "seed step command shown" || bad "seed step command shown"
printf '%s\n' "$out" | grep -q 'DRY RUN DONE' && ok "dry run done" || bad "dry run done"
printf '%s\n' "$out" | grep -q 'SECRET' && bad "a secret value was printed" || ok "no secret printed"

# 2. SUPABASE_SERVICE_ROLE_KEY (and DEMO_PASSWORD) are required.
for v in SUPABASE_SERVICE_ROLE_KEY DEMO_PASSWORD; do
  envs=()
  for e in "${ENV_OK[@]}"; do [ "${e%%=*}" = "$v" ] || envs+=("$e"); done
  out="$(env -i PATH="$PATH" HOME="$HOME" "${envs[@]}" bash "$DEPLOY" --dry-run 2>&1)"; rc=$?
  if [ "$rc" = 2 ] && printf '%s\n' "$out" | grep -q "missing required env: .*$v"; then ok "requires $v"; else bad "requires $v (rc=$rc)"; fi
done

# 3. NODE_ENV=production would make the seed refuse: fail before any step.
out="$(env -i PATH="$PATH" HOME="$HOME" "${ENV_OK[@]}" NODE_ENV=production bash "$DEPLOY" --dry-run 2>&1)"; rc=$?
if [ "$rc" = 2 ] && ! printf '%s\n' "$out" | grep -q '^==> '; then ok "NODE_ENV=production stops before step 1"; else bad "NODE_ENV=production (rc=$rc)"; fi

if [ "$FAILS" -gt 0 ]; then echo "deploy.test: $FAILS failure(s)"; exit 1; fi
echo "deploy.test: all passed"
