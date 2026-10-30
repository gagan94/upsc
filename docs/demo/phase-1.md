# Phase 1 demo runbook: Plan & practise

> **STATUS: PENDING LIVE VERIFICATION**
> Implemented on branch `phase-1-build`; unit/integration suites and type checks pass locally. Not yet done against live services: `db:migrate` and `seed` on Neon/Supabase, `./scripts/deploy.sh`, `scripts/smoke.sh`, and `scripts/e2e/phase1.mjs`. The controller fills in this block (date, commit, URL, smoke and e2e results) after the deploy; until then treat every step below as untested live.
>
> Live result: _(to be filled in: date, commit, web URL, SMOKE OK?, e2e summary pass/fail counts)_

Setup of the stack (Supabase, Neon, Render, Vercel) is unchanged: see `docs/demo/phase-0.md`. Phase 1 adds database migrations and new seed data, so run `db:migrate` and `seed` before the deploy (same commands as Phase 0, section 2).

## 1. What is new

- **Onboarding** (4 steps + review) that builds a rule-based starter plan; **Settings** for profile, preparation, study preferences, appearance, account.
- **Home** on real data: today's plan, practice summary, weekly goal, exam countdown (illustrative dates).
- **Planner**: Today, Week, Month, Backlog and Goals views; add, edit, schedule, complete, skip, delete (with undo) tasks.
- **Study sessions**: start/pause/end from the top bar, 30-second heartbeats, idle pause, recovery of a stale session, history at `/planner/sessions`.
- **Prelims practice**: builder, test workspace (learning and test modes, optional timer, autosave, flag, skip), results with topic breakdown, answer review with option-by-option reasoning, bookmarks, mistake notebook, attempts, report an issue.
- **Admin question bank** (`/admin/questions`): list and filter, create/edit, publish/retire/verify, JSON import (up to 500 rows), question reports.
- **Seed**: 100 original sample questions across Prelims subjects, demo planner and practice history for `student@example.com`, a fresh `newstudent@example.com`.

## 2. Demo accounts

Passwords are never written down here: all three use `DEMO_PASSWORD` from the owner's `.env`.

| Account | Role | Use it for |
|---|---|---|
| `newstudent@example.com` | student, onboarding not started (after the first e2e run it is onboarded) | onboarding, first plan, first practice set |
| `student@example.com` | student with seeded history | Home, mistakes, attempts, planner with data |
| `admin@example.com` | admin | question bank, users, plans |

If `newstudent` has already been onboarded (by a previous demo or the e2e run), re-seeding does not reset it; use a fresh sign-up (12+ character password) for the onboarding part.

## 3. The 10-minute stakeholder demo

1. **New student onboarding (2 min).** Log in as a fresh account. On Home click "Finish personalising my workspace". Choose 2027, Preparing, Both papers, 3 hours a day, Morning and Evening, a support option or two. On the review step show the starter week, then "Accept plan and start". You land on Home with a plan.
2. **Planner (2 min).** Open Planner: Today, then Week and Month for load. Add a task with only a title (it goes to the Backlog), schedule it for today, tick it complete.
3. **Study session (1 min).** Top bar "Study session": choose a length (minimum 5 min), Start, show the timer and Pause. End it, give a focus rating, open "Study session history".
4. **Practice test (2 min).** Prelims, "New practice set": pick Indian Polity, 10 questions, Test mode. Answer a few, flag one, skip one, Submit. Mention that correct answers are not sent to the browser before submit.
5. **Results and review (2 min).** Show score, accuracy, correct/incorrect/skipped, the topic breakdown and the "Next study action". Open a question: explanation, reasoning for each option, "Why this can feel convincing", bookmark it, then show the Bookmarks and Mistakes tabs.
6. **Admin question bank (1 min).** Log out, log in as `admin@example.com`, open `/admin/questions`: filter, open a question, show Publish/Retire/Verify and the JSON import page.

## 4. Before every demo

- [ ] Open the site 2 minutes early to wake the free-tier API (first request can take about a minute).
- [ ] Supabase dashboard: the free project is not paused (restore it if it is).
- [ ] Run `scripts/smoke.sh "$WEB_URL"`: expect `SMOKE OK`.
- [ ] Run the click-through: `PLAYWRIGHT_DIR=<dir> node scripts/e2e/phase1.mjs --base-url "$WEB_URL" --out ./e2e-out` (setup in `scripts/e2e/README.md`): expect exit 0 and no FAIL in `e2e-out/summary.json`.
- [ ] Know `DEMO_PASSWORD`; decide whether to demo onboarding with a fresh sign-up or the (possibly already onboarded) `newstudent`.
- [ ] Skim `/admin/questions` for leftover `[E2E ...]` drafts from test runs (harmless; retired or draft questions never reach students).

## 5. Known limits (say these before anyone asks)

- **Sample questions only.** The 100 seeded questions are original samples labelled "Sample question", not real previous-year questions; no "PYQs only" set will include them. The admin PYQ flow exists but has no verified PYQs yet.
- **Illustrative exam dates.** Home countdowns are labelled "Illustrative targets".
- **No AI features yet:** no AI plan, MCQ generation or Ask AI answers (Phase 3). Mocks, All-India tests, weekly challenge, CSAT/analytics tabs, notifications, data export and recurring tasks are not built; their tabs/pages are stubs or disabled.
- **Home shows two kinds of data:** the top cards are real; "Continue learning", "Current affairs", "Revision", "Mentorship" are labelled sample content.
- **Text size setting only scales rem-based text**; the app mostly uses fixed pixel sizes, so the effect is partial. Appearance settings are stored in the browser only.
- **No "Week N" chip** on Home (the API does not expose account creation date).
- **"How others answered"** shows "Not enough data yet" until 100 first attempts exist.
- **Tab close can lose the last unsaved answer** (answers autosave within a second and on tab hide; the browser warns before leaving).
- Study timer: the displayed time can snap back by up to 45 s when the server credits less than the local estimate; the shortest session in the UI is 5 minutes.
- Practice sizes offered are 10, 20 and 50; a subject with fewer questions starts a shorter set and says so.
- Free-tier hosting: cold starts, Supabase pause after inactivity, no email confirmation, no 2FA (as in Phase 0).
- Not checked by a human yet: visual match to Figma and the 390 px mobile layout (see `docs/superpowers/phase-1-followups.md`, section C).
