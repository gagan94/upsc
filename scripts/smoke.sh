#!/usr/bin/env bash
# Smoke test for a deployed demo. Usage: scripts/smoke.sh <WEB_URL>
# Env: SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_PASSWORD (required);
#      SMOKE_WAIT_SECONDS (optional, default 90) to wait for the API to wake.
# Never prints the access token or the password.
set -euo pipefail

WEB_URL="${1:-}"
if [ -z "$WEB_URL" ]; then
  echo "usage: scripts/smoke.sh <WEB_URL>" >&2
  exit 2
fi
WEB_URL="${WEB_URL%/}"

missing=()
for v in SUPABASE_URL SUPABASE_ANON_KEY DEMO_PASSWORD; do
  [ -n "${!v:-}" ] || missing+=("$v")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "smoke: missing required env: ${missing[*]}" >&2
  exit 2
fi
SUPABASE_URL="${SUPABASE_URL%/}"
WAIT="${SMOKE_WAIT_SECONDS:-90}"

fail() {
  echo "✗ $1" >&2
  echo "SMOKE FAILED" >&2
  exit 1
}
ok() { echo "✓ $1"; }

# json_get <expr on d> reads JSON from stdin and prints the value of the expression.
json_get() {
  node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{const d=JSON.parse(s);const v=eval(process.argv[1]);process.stdout.write(v===undefined?"":String(v))}catch(e){}})' "$1"
}

# 1. Wait for the API (free hosts sleep) to answer /api/v1/health with 200.
health_body=""
deadline=$((SECONDS + WAIT))
while :; do
  resp=$(curl -s -w '\n%{http_code}' --max-time 10 "$WEB_URL/api/v1/health" || true)
  code="${resp##*$'\n'}"
  if [ "$code" = "200" ]; then
    health_body="${resp%$'\n'*}"
    break
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    fail "health not ready after ${WAIT}s (last HTTP status: ${code:-none})"
  fi
  sleep 3
done
ok "health responded 200"

db=$(printf '%s' "$health_body" | json_get 'd.db')
[ "$db" = "up" ] || fail "health reports db=\"${db:-unknown}\", expected \"up\""
ok "health db is up"

# 2. Sign in as the demo student.
login_body=$(node -e 'process.stdout.write(JSON.stringify({email:"student@example.com",password:process.env.DEMO_PASSWORD}))')
login_resp=$(curl -s --max-time 20 -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d "$login_body" || true)
token=$(printf '%s' "$login_resp" | json_get 'd.access_token')
[ -n "$token" ] || fail "student sign-in failed (no access token returned)"
ok "student sign-in"

# 3. Learn subjects: exactly 8.
subj_resp=$(curl -s --max-time 20 -H "Authorization: Bearer $token" "$WEB_URL/api/v1/learn/subjects" || true)
count=$(printf '%s' "$subj_resp" | json_get 'Array.isArray(d.subjects)?d.subjects.length:""')
[ "$count" = "8" ] || fail "learn/subjects returned ${count:-no} subjects, expected 8"
ok "learn/subjects returns 8 subjects"

# 4. Admin endpoint must be forbidden for a student.
admin_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H "Authorization: Bearer $token" "$WEB_URL/api/v1/admin/users" || true)
[ "$admin_code" = "403" ] || fail "admin/users returned HTTP ${admin_code:-none} for a student, expected 403"
ok "admin/users is 403 for a student"

echo "SMOKE OK"
