# Phase 1 end-to-end click-through

`phase1.mjs` drives a real browser (Playwright, Chromium) through the Phase 1 screens on a deployed site. It is run by hand; Playwright is deliberately **not** a repo dependency.

## One-time setup (any temp directory)

```sh
export PATH=$HOME/.local/node22/node_modules/node/bin:$HOME/.local/bin:$PATH
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y >/dev/null && npm i playwright && npx playwright install chromium
```

## Run

The script finds Playwright through the `PLAYWRIGHT_DIR` environment variable (the directory that contains `node_modules/playwright`). Without it, plain `import` resolution is used (for example if you ran it from a directory that has Playwright installed).

```sh
cd <repo>
set -a; . ./.env; set +a          # provides DEMO_PASSWORD (never printed by the script)
PLAYWRIGHT_DIR=/tmp/pw node scripts/e2e/phase1.mjs --base-url https://<web-url> --out ./e2e-out
```

- `--dry-run` prints the planned scenarios and steps, needs no password, browser or network.
- `--only a,c` runs only some scenarios (a newstudent flow, b practice test, c student seeded data, d admin, e RBAC).
- `--headed` shows the browser; `--skip-warmup` skips the initial wait for `/api/v1/health` (Render free tier can take about a minute to wake).
- Exit code 0 = every step passed, 1 = at least one step failed, 2 = bad usage or Playwright missing.
- Output: progress on stderr; a JSON summary on stdout and in `<out>/summary.json`; one screenshot per step in `<out>` (`*-FAIL.png` for failures).

## What counts as a failure

Every step fails on any uncaught page error, any `console.error`, or any HTTP 4xx/5xx from the app's own origin, unless the step lists it in its `expect` array (none do today). A failing step does not stop the run: later steps and scenarios still execute (a failed log-in skips the rest of its scenario).

## Re-running

Titles and stems carry a timestamp. The script copes with `newstudent@example.com` having already finished onboarding (it skips the wizard and says so in the summary), with an old running or stale study session, and with a question that is already bookmarked. It does leave data behind: an extra completed task and one study session for `newstudent`, one practice set, a bookmark, two draft questions (`[E2E <stamp>] ...`) and one retired question. The seed itself is only needed once.

## Known differences from the plan text

- Password login lands on `/home`, not `/onboarding`; the script follows the "Finish personalising my workspace" banner.
- The builder offers 10/20/50 questions (not 5) and the shortest study session the dialog allows is 5 minutes; the script uses 10 questions and a 5-minute session that it ends after the first heartbeat (about 30 s).
