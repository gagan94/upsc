# Phase 1 — rulings, deferred minors, unverified assumptions, hardening

Written 2026-10-30 at the end of the Phase 1 build (branch `phase-1-build`). Source: the controller's ledger and the per-task reviews. Nothing here blocks the demo. No secrets.

## A. Rulings made during the build (owner may override; cost if wrong)
- **R1** AppError has no details field, so validation errors use the message only. *Cost: nothing (later: map zod issues to `{path,message,code}`).*
- **R2** Practice builder reads optional `?subject=<syllabusNodeId>` to preselect a subject. *Cost: cosmetic prefill.*
- **R3** Admin layout admits admin OR content_editor; editors see only Questions and Question reports. *Cost: a nav tweak.*
- **R4** Mistakes list has no per-item review link (API has no session/ordinal for a mistake). *Cost: cosmetic.*
- **R5** Commits add files explicitly; `.mcp.json` and `.neon` stay local. *Cost: none.*
- **R6** Folded Task 3 minors into Task 4: backlog counts only todo/in_progress; `complete()` is idempotent. *Cost: one test each.*
- **R7** Two parallel lanes (API / web) merged afterwards. *Cost: contract drift, fixed at merge.*
- **R8** Heartbeat on a stale session is rejected 409 `session_stale` and leaves the row alone; plain `end` on a stale session ends at last heartbeat. *Cost: one error code in the client.*
- **R9** Web UI primitive fixes folded into Task 12 (ReportType values, Tabs fallback, Field describedby, Modal focus). *Cost: a few lines.*
- **R10** Empty subject pool gives 409 `catalog_empty`; onboarding `complete` is a single transaction. *Cost: client copy.*
- **R11** Specific copy for `catalog_empty`/`onboarding_incomplete`; text-size scaling limitation accepted. *Cost: partial text-size effect.*
- **R12** 5 MB global JSON body limit with `payload_too_large` envelope; published-question PATCH re-checks completeness; question update locks the row. *Cost: DoS surface before auth (see D).*
- **R13** Practice subjects are Prelims GS-I syllabus child nodes; `GET /practice/subjects` lists distinct nodes with published questions; `time_ms` clamped; explicit submit after `ends_at` returns 200 expired results. *Cost: data-model rework if nodes change.*
- **R14** Study timer display is server-authoritative (base + at most 45 s local); can snap down; End dialog sends a final heartbeat. *Cost: small visible jumps.*
- **R15** Seed demo mistakes mirror the engine's rules, oldest session first; content fixes after fact-check; seed validates all then writes in one transaction. *Cost: seed edits.*
- **R16** `ErrorPanel` gets an `embedded` variant (no nested `<main>`). *Cost: none.*
- **R17** Added `GET /admin/syllabus-nodes` (admin/editor) so the admin UI selects subjects by name. *Cost: one endpoint.*
- **R18** Workspace `?note=` text is accepted only if it matches `Started with N of M requested questions`, then rebuilt from the integers. *Cost: other notes ignored.*
- **R19** Admin UI fix round: select by node name, hide Users/Plans cards from editors, PATCH only changed fields, radiogroup, notFound mapping. *Cost: none.*
- **R20** Test workspace autosave fixes (flush on timeout, ordered flushes, focus management, backoff, 60 s re-sync). *Cost: none.*
- **R21** Tab-close saves rely on `beforeunload` + visibility-hidden flush; pagehide flush is best-effort (apiFetch awaits the session token). *Cost: last answer may be lost on a hard close.*
- **R22** Stray `-E` backup file removed; score formatted to 2 dp with a real minus; null `correct` shown as Skipped. *Cost: none.*
- Brief-level calls: marking default +2/−0.66; no recurrence; rule-based starter plan; only `single` and `statements` formats; seeded questions are samples; appearance settings are browser-local; the e2e script uses a 10-question set and a 5-minute session (UI minimums).

## B. Deferred minors, by area
**API**
- Validation: raw zod issues echoed; test message-format gaps; zod schemas non-strict; timezone aliases not canonicalised; bio not trimmed; `updateAccountProfile` silently no-ops without a profiles row.
- Planner: `assertSubject` accepts draft nodes; `overdue()` unbounded; no non-IST/overdue-tz/unscheduled-isolation tests; `parseISO` needs caller validation; no `from<=to` check on `GET /study-sessions`; `dateISO` helper was duplicated.
- Study: pause/resume/end drop time since the last heartbeat (client contract); end + completeTask not atomic; conflict body may carry `active:null`.
- Home/goals: per-day vs total floor can differ by <1 min; streak aggregated in JS (~366 days) and untested at 23:30/00:10 IST; home computes full progress for four numbers; skipped tasks counted in `tasksTotal` but not `plannedMin`; no unique (exam, year) on `exam_dates`.
- Onboarding: preview/pure fn lacks `source`; PUT-after-completed 409 untested; DST arithmetic is `dayStart+minutes*60000`; evening/night windows overlap; 3-in-a-row break truncates single-subject plans; shallow app-side merge on save; `findBySlugs` slugs param unused, `PlanSubject` duplicated.
- Practice: `GET /practice/subjects` ordering; finalize does one UPDATE per question; learning answer reloads all question rows; entitlement consumed before validation; review shows live stem/options with the frozen key (mismatch if edited after the session); guessed entries start at `times_wrong=1`.
- Reports: no dedupe or rate limit, stores `''` text; admin report list returns reporter userId, open only, no cursor.
- Admin: PATCH on drafts; `GET /admin/syllabus-nodes` ordered alphabetically by stage ('mains' first), no id tiebreaker, no pagination, 401/403 tests don't assert the envelope; import allows ai_generated/pyq drafts without year/paper; `patch as never` cast.
- Tests: some leakage assertions check field names plus seeded values only for known strings; missing tests for retry skipping retired questions / `no_questions` / retry entitlement; jest "worker failed to exit gracefully" notice seen once.

**Web: planner**
- Optimistic rollback can overwrite a second overlapping action; undo-delete clears undo before POST (no retry) and a second delete replaces the first undo; undo of a deleted completed/skipped task recreates it as todo.
- Failed create/edit shows both dialog alert and page banner; a task created on another day silently disappears; all client errors say "Task save failed" (404 ghost row retries forever); overload banner stale after optimistic edits; banner markup duplicated Today vs Backlog; `OverdueBanner` hard-codes amber; `/learn/subjects` failure takes down the whole page; `fixtures.ts`/`user-shim.ts` live in `src/`.
- `RescheduleDialog` clearing the date silently no-ops; `?date=` only regex-validated (2026-13-45 shows the generic error); Goals has no prev/next week and progress is not refetched after save; `saveTargets` drops targets for subjects missing from the list; week cards lack complete/skip/delete and tasks moved out of the week vanish silently; month load thresholds (<2h/<4h) are not Figma-checked; `WeekView.test` sets `process.env.TZ="undefined"`; missing tests (undo expiry, PATCH body, complete with minutes, skip, DST day).
- Onboarding/settings: dark theme flash before hydration (needs an inline script); settings `?section` fallback; progressbar `aria-valuenow` is 0-based; duplicate import in `Review.tsx`; types test asserts little; Home plan chip lacks "Week N" (no account creation date in the API); per-card sample badge missing on the sample cards; page-level Home test gaps.

**Web: study timer**
- `load()` early return skips `setLoaded(true)` if the epoch changed; idle auto-pause failure shows an alert the user didn't trigger; narrow race (heartbeat sent after the pause POST started); StillStudying "End" sends a heartbeat on a paused session; Start dialog has no task picker and defaults to 25 min instead of `defaultSessionMin`; `completeTask` doesn't refresh an already rendered planner list; fieldset legend + aria-label duplicate.

**Web: prelims**
- Workspace: re-sync starves while a save error persists; `isBusy` test covers only the in-flight branch; StrictMode dev double focus/announce; redundant live region; retry timer one-shot after unmount; countdown anchored at mount rather than server fetch; header has no subject name; learning-mode un-Checked drafts are not saved; `remainingSeconds` floored so auto-submit can fire ~1 s early.
- Results/review: ReportIssueDialog resets on close while sending (late resolve shows stale "Thanks"); score `−0`; `answerStatus` lives in `QuestionReviewList`; bookmark ignores clicks without an `aria-busy` cue; ReasoningBox has no unsaved-change protection; bars lack progressbar roles; no `loading.tsx`.
- Hub: disabled-tab wrapper `aria-label` on a div without a role; `?note`-style free text avoided but disabled tabs have only `title` tooltips; AvailabilityNotice has no stable live region; stale-render window on Start; duplicate label/aria-label Chips; Tabs automatic activation is chatty; test gaps (stale availability race, double submit, network error on start, availability error state, `?source=pyq`, 401 on `/prelims/new`); mistakes list could resolve title to node id for a "Practise this topic" link.

**Web: shared UI**
- Modal initial focus on Close in some cases; Tabs `aria-controls` dangling without `idPrefix`, no overflow-x; weak tests for Button/Banner variants; `formatDateLong` throws on bad input; some types inferred rather than confirmed (bio/location nullability, ended-session extras, goals/exam-date field names).

**Web: admin**
- PATCH last-write-wins across editors; `undefined as unknown as null` cast; gsPaper/pyqPaper limits mirrored but stale validation message "enter a valid syllabus node id"; whitespace-only edit leaves dirty with empty diff; a question whose node is not in the published list shows a blank select; ImportForm reads the file before checking size; no unsaved-changes guard; statement rows keyed by index; reports capped at `limit=50` with no Load more or resolve action; focus is moved to the banner but not restored after Retire.

**Seed / content**
- Re-seeding overwrites admin edits (version>1) and exam dates: the seed is for fresh/demo environments only.
- Weak misconceptions (csat-average, eco-deficits, polity-habeas-corpus, sci-isotopes); templated statement reasoning; `eco-deficits` statement wording should be re-read.
- Mistakes/bookmarks are matched by question, not seed ownership; the recompute test mirrors the same algorithm as the engine (cannot catch a rule wrong in both); demo planner timestamps are relative to the seed run (before about 07:52 IST completed demo tasks land on yesterday).
- Statement questions: keys now B13 C10 A7 D3; planned follow-up is more "2 only"/"Neither" variety and real PYQs once licensed.

## C. Unverified assumptions (nothing below was run against real services)
1. **Concurrency on real Postgres:** the one-active-study-session race (exactly one 201, one 409), first-login upsert, entitlement counters, submit-twice idempotency were tested only on PGlite (single connection). Run once on a throw-away Neon branch (`TEST_DATABASE_URL`).
2. **Migrations on Postgres 18 / Neon:** applied only on PGlite; run `db:migrate` against Neon's direct URL and re-run it to confirm idempotence.
3. **Real Supabase flows:** login, signup with `newstudent`, token verification (JWKS vs HS256), seed against Supabase admin API (carried over from Phase 0).
4. **Seed on real databases:** `seed` run twice must give the same report; 200 round-trips replaced by one transaction but never run remotely.
5. **Browser and visual check:** no component was viewed in a real browser by a human; `scripts/e2e/phase1.mjs` has only been dry-run and mock-checked, never against the live site; the Figma comparison of Home, Planner (Today/Week/Month), Prelims workspace and Results (Task 21 step 4) is not done; intentional differences must be logged here afterwards.
6. **Responsive 390 px** layouts and keyboard-only flows have only been reviewed in code.
7. **Render/Vercel:** cold start vs rewrite timeout with the longer Phase 1 requests; heartbeat traffic on the free tier; Vercel build with the new routes.
8. **Timer behaviour in real browsers:** background-tab throttling, laptop sleep, the 45 s extrapolation cap, idle pause at 3 min.
9. **Fact-check of seed content** was done by an AI reviewer (all 100 questions, CSAT recomputed); no human subject-matter expert has reviewed it.

## D. Recommended hardening before real users
- Route-scoped body limits (global 5 MB JSON parse happens before auth): keep 5 MB only on the import route, 100 kB elsewhere, and add per-route rate limits.
- Unique expression index on the normalised question stem (the app-level duplicate check is raceable); handle `23505` as 409.
- Question reports: dedupe per user and question, rate limit, reject empty text, hide reporter id in the admin list, add a cursor.
- Cache or pre-aggregate `othersAnswered` (currently scans all answers per request); counter table once volume grows.
- Tab-close save: queue answers in `sessionStorage`/`sendBeacon` with a cached token so a hard close cannot lose the last answer.
- Keep the seed out of production (guard against overwriting edited questions and exam dates).
- Row-lock or version check on study-session end/complete; make end + completeTask one transaction.
- Make `users.status` and `@Roles` fail-closed everywhere (Phase 0 items still open); stop logging stacks with PII.
- Replace `rejectUnauthorized:false` for Neon once verified; add indexes noted in Phase 0 follow-ups.
- Add a syllabus-node list for editors with ordering and pagination; add a real Phase 1 CI job (deferred by D19) running the API/web suites and `node --check` on the e2e script.
- Decide O1 (free vs paid tiers) before enforcing more than `practice.session` and `study.session`.

## E. Final review fix wave (ruling R23)
The final whole-branch review found F1–F8. Fixed on `phase-1-build`, each with tests:
- **F1 fixed** — subjects end to end use syllabus-node ids: `seed-data/subjects.json` points each catalog subject at its own Prelims level-3 node (Polity/History/Geography/Economy/Environment/Sci-Tech; CSAT → `prelims-csat`, Ethics → `mains-gs-4`; the `gsPaper` display field is unchanged), `GET /learn/subjects` returns `syllabusNodeId`, and TaskDialog, StartSessionDialog, GoalsView, usePlannerMutations and SessionHistory use it as the option value and lookup key. `PUT /planner/goals` rejects non-node ids (400). GoalsView keeps saved targets for subjects the form does not list. A re-seed converges the live catalog (upsert of `subjects.syllabus_node_id`). Tasks/goals already stored with a Mains node id keep it (the Mains node still exists, so nothing breaks; they show the Mains title).
- **F2 fixed** — re-seeding nulls `study_sessions.task_id` for the student's sessions that point at seeded tasks before deleting them (same transaction); the sessions survive.
- **F3 fixed** — `scripts/deploy.sh` runs tests → migrate → **seed** → Render → Vercel → smoke (`[n/6]`); requires `SUPABASE_SERVICE_ROLE_KEY` (deploying machine only) and stops up front if `NODE_ENV=production`; `scripts/test/deploy.test.sh` checks the dry run. Note: this supersedes "keep the seed out of production" in D for the demo environment; the seed's own `NODE_ENV=production` guard remains.
- **F4 fixed** — pause/resume reject a stale session with 409 `session_stale` (row untouched), like heartbeat; `recover` is the way back. The web provider already opened Recovery on that error (test added).
- **F5 accepted** — the smoke test adds one practice set per deploy (documented under Known limits in `docs/demo/phase-1.md`).
- **F6 fixed** — the 33 statements stems now read "Consider the statements below regarding X. Which of them is/are correct?" (slugs unchanged; re-seed updates in place).
- **F7 fixed** — password login checks `GET /me/onboarding` like sign-up: `not_started` → `/onboarding`; other statuses or a failed lookup keep the safe `return_to`. All three entry points (sign-up, password login, Google OAuth callback) now apply the same rule.
- **F8 fixed** — `dateISO` is imported from `common/validation` in the study-sessions controller.
