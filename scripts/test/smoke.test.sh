#!/usr/bin/env bash
# Runs scripts/smoke.sh against a local stub. Usage: bash scripts/test/smoke.test.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMOKE="$DIR/../smoke.sh"
PORT=$((20000 + RANDOM % 20000))
PASSWORD="demo-pass-SECRET456"
STUB_PID=""
FAILS=0

cleanup() { [ -n "$STUB_PID" ] && kill "$STUB_PID" 2>/dev/null; wait 2>/dev/null; return 0; }
trap cleanup EXIT

start_stub() {
  cleanup
  node "$DIR/smoke-stub.mjs" "$PORT" "$1" &
  STUB_PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "http://127.0.0.1:$PORT/x" && return 0
    sleep 0.1
  done
  echo "stub did not start" >&2; exit 1
}

# run_case <name> <scenario> <expect: pass|fail> [extra env assignments...]
run_case() {
  local name="$1" scenario="$2" expect="$3"
  shift 3
  start_stub "$scenario"
  local out rc
  out=$(env SUPABASE_URL="http://127.0.0.1:$PORT" SUPABASE_ANON_KEY=anon-key DEMO_PASSWORD="$PASSWORD" \
        "$@" bash "$SMOKE" "http://127.0.0.1:$PORT" 2>&1)
  rc=$?
  local good=1
  if [ "$expect" = pass ]; then
    [ "$rc" -eq 0 ] && grep -q '^SMOKE OK$' <<<"$out" || good=0
  else
    [ "$rc" -ne 0 ] && ! grep -q 'SMOKE OK' <<<"$out" || good=0
  fi
  if grep -q 'SECRET123\|SECRET456' <<<"$out"; then good=0; echo "  !! secret leaked in output"; fi
  if [ "$good" -eq 1 ]; then echo "PASS  $name (exit $rc)"; else echo "FAIL  $name (exit $rc)"; FAILS=$((FAILS+1)); fi
  sed 's/^/        /' <<<"$out"
}

run_case "all good"                       ok          pass
run_case "subjects count != 8"            subjects7   fail
run_case "admin endpoint returns 200"     admin200    fail
run_case "health never ready"             never-ready fail SMOKE_WAIT_SECONDS=2
run_case "health db down"                 db-down     fail

# Missing env must be reported by name.
out=$(env -u DEMO_PASSWORD SUPABASE_URL=http://x SUPABASE_ANON_KEY=k bash "$SMOKE" http://x 2>&1); rc=$?
if [ "$rc" -ne 0 ] && grep -q DEMO_PASSWORD <<<"$out"; then echo "PASS  missing env named (exit $rc)"; else echo "FAIL  missing env"; FAILS=$((FAILS+1)); fi

echo
if [ "$FAILS" -eq 0 ]; then echo "ALL SMOKE TESTS PASSED"; else echo "$FAILS FAILED"; exit 1; fi
