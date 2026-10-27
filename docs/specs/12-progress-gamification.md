# 12 — Progress, analytics, streaks, XP and leaderboards

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01–11, 15 (circles) | **Used by:** 10, 14, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
A truthful picture of preparation: recorded study, syllabus coverage, practice accuracy, revision health, writing quality, habits, and optional social comparison — and a clear "what to work on next". Design principles: *recorded work only*; *rest days are part of the plan*; *meaningful activity* counts for streaks; XP is "earned through verified learning"; comparison is opt-in and honest about sample size.

## 2. Actors
Student (self), peers in leaderboards/circles (opt-in), admin (config of XP and thresholds).

## 3. User stories
- US-12-01 I open Progress and see this week's focused study, tasks completed, practice accuracy, current streak, study activity by day, weekly goal, what needs attention and syllabus coverage.
- US-12-02 I drill into Syllabus (subject -> topic), Practice analytics (Prelims timed/untimed, PYQs, retries, mistakes), Mains writing analytics, Habits & achievements, Leaderboard.
- US-12-03 I can change the period (week/30 days/custom), refresh, and see metrics & data definitions.
- US-12-04 I earn XP and achievements through real learning, keep a streak with rest days, and optionally compete in weekly leaderboards or my study circle.
- US-12-05 If I have no data yet or data failed to refresh, I get a clear helpful state.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Overview ("Your progress": period "5–11 Oct 2026", Refresh, Metrics & data; tabs Overview · Syllabus · Practice analytics · Habits & achievements · Leaderboard; cards Focused study 8h20m, Tasks completed 6/9, Practice accuracy 78% (56/72), Current streak 4 days; Study activity; Weekly study goal 8h20m of 10h; Needs attention; Syllabus coverage; "Plan your next study task") | `149:16195` Your progress |
| Syllabus | `238:30258` Syllabus progress · `239:30826` Indian Polity · `239:30973` Fundamental Rights |
| Practice | `238:30405` Practice analytics · `239:31120` PYQ analytics · `239:31267` Mains writing analytics · `239:31414` Mistake review · `239:31561` Retry analytics · `245:34750` Timed practice analytics · `245:34897` Untimed practice analytics |
| Habits & achievements (Current streak 4 days "3–6 Oct · Meaningful activity", Weekly consistency 2/5 days, Weekly XP 580 "Earned through verified learning", Personal best 9-day streak; Your study rhythm with rest days & reminder; Weekly revision challenge; Achievements: First revision cycle, Consistent week, Mistake explorer (in progress); Personal milestones: Accuracy improved +8 points, Most productive week 12h, First Mains answer) | `238:30552` · `239:33766` Weekly goal achieved · `239:33913` Start a fresh streak |
| Reports/periods | `239:31708` Previous week report · `239:31855` Last 30 days · `239:32002` Weekly learning XP · `239:32149` Focused study minutes · `239:32296` Weekly consistency |
| Leaderboard | `238:30699` Leaderboard · `239:32443` Polity Circle • Group ranking · `239:32590` All-time learning XP · `239:32737` You're not ranked yet |
| Empty / system states | `239:32884` Start your progress journey · `239:33031` No activity in this period · `239:33178` You're viewing saved progress (stale) · `239:33325` Refreshing your progress · `239:33472` Progress could not refresh · `239:33619` Not enough practice data yet |
| Components | `237:30868` Metric card · `237:30872` Progress track · `253:35814` Exact tracks · `253:35815` Goal track · `253:35817` Monday track · `257:36129` Activity row |
| Revision trends | `513:80699` (11) |

## 5. Functional requirements
**Metrics (definitions are authoritative; shown in "Metrics & data")**
- FR-12-01 `[FIGMA]` **Focused study time** = sum of recorded study-session active time (10); excludes idle and unrecorded timers.
- FR-12-02 `[FIGMA]` **Tasks completed** = completed ÷ scheduled in period (skipped excluded from numerator, included in denominator unless rescheduled).
- FR-12-03 `[FIGMA]` **Practice accuracy** = correct ÷ answered (excludes skipped; separate timed/untimed; first attempts vs retries separated: "Compare first attempts with retries").
- FR-12-04 `[FIGMA]` **Syllabus coverage** = % of *required* lessons completed per subject/topic (05) plus an independent **mastery** indicator derived from practice+revision per syllabus node; both shown separately ("Keep retention separate from reading completion").
- FR-12-05 `[FIGMA]` **Streak**: consecutive *planned* days with ≥ 1 meaningful activity (≥ 20 min focused study OR ≥ 10 answered questions OR ≥ 1 completed lesson OR ≥ 10 reviewed cards OR 1 evaluated Mains answer `[PROPOSED thresholds, configurable]`); rest days (user-defined weekly day(s), e.g. Sunday) don't break the streak; "Start a fresh streak" state after a break; 1 "freeze" per week `[PROPOSED]`.
- FR-12-06 `[FIGMA]` **Weekly consistency** = planned days completed ÷ planned days so far.
- FR-12-07 `[FIGMA]` **XP**: points for verified learning events: lesson completion (once), module completion, practice set completion (scaled by accuracy and difficulty, diminishing returns on repeats), revision sessions, Mains answer submitted/rewritten, mock tests, streak days; no XP for idle time or re-reading; daily XP cap `[PROPOSED]` to prevent farming; config table `xp_rules`.
- FR-12-08 Achievements & milestones: rule-engine (condition JSON + progress counters) e.g. First revision cycle, Consistent week, Mistake explorer (review 10 mistakes), First Mains answer, Accuracy improved (+8 points vs prior period with minimum sample), Most productive week; badges stored with `earned_at`; progress shown ("6 / 10 completed").
- FR-12-09 Needs-attention list: topics with low accuracy (min sample 10 questions), due revision, recurring mistakes, overdue tasks, syllabus gaps; each with a one-click action ("Plan your next study task" creates a planner task; "Practise" opens a prefilled set).

**Views**
- FR-12-20 Period selector (week default; previous week; last 30 days; custom ≤ 6 months); Refresh forces recompute; "You're viewing saved progress" banner if snapshot older than 15 min or offline; "Refreshing…" and "could not refresh" states with retry; "Not enough practice data yet" thresholds (e.g. < 10 answered).
- FR-12-21 Syllabus view: tree with per-node coverage, mastery, last studied, due revisions, and links (open topic, practise, revise).
- FR-12-22 Practice analytics: accuracy by subject/topic/difficulty, speed (time/question), guess rate, confidence calibration, timed vs untimed, PYQ vs platform, retry improvement, mistake categories.
- FR-12-23 Mains analytics: attempts, rubric dimension trends, rewrite uplift, word-limit adherence, weak keywords (09).
- FR-12-24 Habits: streak, consistency, XP, rhythm (daily minutes, rest days), weekly revision challenge, achievements, personal milestones ("Your own improvement is the goal" — no ranking pressure).
- FR-12-25 Export: CSV/PDF of progress report (weekly report email `[PROPOSED]`).

**Leaderboards (opt-in)**
- FR-12-30 `[FIGMA]` Leaderboard boards: Weekly learning XP, Focused study minutes, Weekly consistency, All-time learning XP, and **group rankings** (e.g. "Polity Circle") for study circles (15). Time windows reset Monday 00:00 IST.
- FR-12-31 Only users with `leaderboard_opt_in=true` appear and see ranks; others see "You're not ranked yet — opt in or start learning". Display = handle + avatar (privacy setting), never real name unless chosen.
- FR-12-32 Anti-abuse: XP only from verified events; per-event dedupe; manual adjustments audited; outlier detection (> 16 h focused/day flagged and excluded pending review).
- FR-12-33 Percentile/rank only shown when cohort size ≥ N (default 50); otherwise show own value + "Not enough participants yet".
- FR-12-34 Home widget "Streak and study rank · Weekly rank #12 · 8h 20m" with links to Achievements and Leaderboard.

## 6. Data model (module `progress`)
- `daily_activity(user_id, date, focused_seconds, tasks_scheduled, tasks_completed, questions_answered, questions_correct, cards_reviewed, lessons_completed, mains_submitted, meaningful bool, xp_earned, rest_day bool)` — rollup written by event consumers.
- `topic_mastery(user_id, syllabus_node_id, coverage_pct, accuracy, attempts, last_practiced_at, retention_pct, due_reviews, mastery_score, updated_at)`
- `streaks(user_id pk, current, best, last_active_date, freeze_available, started_on)`
- `xp_events(id, user_id, kind, ref, points, created_at, idempotency_key)`; `xp_rules(kind, base_points, caps jsonb, active)`
- `achievements(id, key, name, description, rule jsonb, tier)`; `user_achievements(user_id, achievement_id, progress, earned_at)`
- `weekly_snapshots(user_id, week_start, metrics jsonb, generated_at)`
- `leaderboard_entries(board, window_start, user_id, score, rank, group_id null)` (materialised, refreshed every 5 min) · `leaderboard_prefs` lives in privacy settings (02).
- `metric_definitions(key, title, formula_text, version)` (powers "Metrics & data").

## 7. API surface
`GET /progress/overview?from=&to=` · `GET /progress/syllabus?node=` · `GET /progress/practice?...` · `GET /progress/mains` · `GET /progress/habits` · `GET /progress/achievements` · `GET /progress/leaderboard?board=&group=&window=` · `POST /progress/refresh` · `GET /progress/metrics-definitions` · `GET /progress/report?format=csv|pdf` · `PUT /me/rest-days` (settings) · Admin: `/admin/progress/xp-rules`, `/admin/progress/achievements`.

## 8. AI behaviour
Optional natural-language insight ("Why did my accuracy drop?") via Ask AI with `progress_summary` tool (14): grounded on the user's own rollups only. Weekly summary text (`report_compose`) generated from metrics, never invent numbers; fall back to template. No AI in leaderboards/XP.

## 9. Entitlements
`progress.basic` (free), `progress.advanced` (practice/mains analytics, exports), `leaderboard.view`. TBD (O1).

## 10. Events
Consumes: `study_session.ended`, `task.*`, `question.answered`, `session.submitted`, `lesson.completed`, `revision.reviewed`, `mains.*`, `article.read`. Emits: `achievement.earned`, `streak.broken|extended`, `weekly.report_ready` -> notifications (04).

## 11. Non-functional
Rollups updated within 60 s of events; overview endpoint p95 < 400 ms (served from rollups); idempotent event processing; backfill job to rebuild from raw events; metric definitions versioned so historical charts stay interpretable; timezone-correct day boundaries per user tz.

## 12. Edge cases
Back-dated edits (study session edited within 24 h recompute day); timezone changes; account merged/deleted; XP rule changes (apply forward only); leaderboard ties; opting out mid-week (remove from boards immediately); very new user (journey state); streak with rest-day change (applies prospectively).

## 13. Acceptance criteria
- Given Sunday is my rest day and I was active Fri and Sat and Mon, then my streak continues across Sunday.
- Given I opted out of leaderboards, then my name never appears in any board or API response to others.
- Given a 5-question practice set (< minimum), then Practice analytics shows "Not enough practice data yet" instead of percentages.
- Given I re-read a completed lesson 5 times, then XP is awarded once.

## 14. Task breakdown hint
1. Event consumers + daily rollup + metric definitions (L)
2. Progress overview API/UI + states (M)
3. Syllabus mastery model + view (L)
4. Practice/Mains analytics views (M, with 08/09)
5. Streak/XP/achievements engines + UI (L)
6. Leaderboards (materialised boards, opt-in, groups) (M)
7. Reports/export + weekly summary email (S)

## 15. Open questions
O1; streak thresholds; rest-day UX; XP weights; minimum cohort sizes; whether mentors see a student's progress summary for booked sessions (proposed: only what the student shares in "Prepare session", 16).
