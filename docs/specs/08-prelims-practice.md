# 08 — Prelims practice, question bank, mocks and All-India tests

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03, 05, 14 | **Used by:** 10, 11, 12, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`. Question source = admin-managed bank **and** AI generation (D7).

## 1. Purpose
Objective-question practice for UPSC Prelims (GS Paper I and CSAT Paper II): topic practice, previous-year questions (PYQs), full mocks, scheduled **All-India** tests with ranking, and deep answer review that teaches *why* an option is right or tempting. Feeds revision (mistakes), analytics and recommendations.

## 2. Actors
Student; Content editor (question bank, verification, answer-key updates); Admin (schedule All-India tests); AI (generates drafts and explanations).

## 3. User stories
- US-08-01 I build a practice set: choose subject(s)/topic, question source (platform questions, PYQs only, mixed), count (10/20/50), mode (learning vs test), timing (timed/untimed); I see availability before starting.
- US-08-02 In a test I can answer, flag for review, skip, navigate by number, see time remaining, save & next, and submit.
- US-08-03 After submit I see score, accuracy, correct/incorrect/skipped, and a "next study action".
- US-08-04 For each question I see correct answer, why, option-by-option reasoning, why a distractor feels convincing, how others answered, and I can record my own reasoning/confidence.
- US-08-05 I keep a Mistake notebook, bookmarks, attempts history, and can retry or save a revision set.
- US-08-06 I take scheduled All-India tests, get provisional then published results with rank and a leaderboard, and can see what I missed.
- US-08-07 I ask AI to generate practice MCQs on a topic, article or lesson.
- US-08-08 As an editor I upload/verify questions, map them to the syllabus and update answer keys (with student notification).

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Prelims home / hub (tabs Practice · PYQs · Mock tests · CSAT · Bookmarks · Analytics · Weekly challenge; shortcuts Mistakes, My attempts) | `129:11196` Prelims practice · `329:50946` Subject practice · `329:52906`/`53102` Learning practice |
| Build your practice (Subjects; Question source Platform questions / PYQs only / Mixed / "Polity + History" / All GS subjects; count 10/20/50; Learning vs Test mode; Timed/Untimed; "Review practice set", "Availability example") | `329:51730` |
| PYQs | `329:51142`/`51338`/`51534` Previous year questions |
| Mocks / CSAT | `329:52122` Mock tests · `329:52318` CSAT practice · `329:51926` Test details |
| Test workspace (header "Polity practice · Question 8 of 20", selected answer chip, timer "Adaptive MCQ set · 22:14 remaining", navigation & review panel: answered / flag for review / remaining, set progress, Save & next) | `129:11371` · `222:30106` Practice / Polity • Question 9 · `329:52514`/`52710` Test workspace · exam-style sequences `341:51179` GS instructions, `341:51389`–`52019` q1–q4, `341:52229`–`52859` r1–r4 (review), `341:53069` GS results; `341:53279` CSAT instructions, q1–q4 `53489`–`54119`, r1–r4 `54329`–`54959`, results `341:55169` |
| Results & review | `329:53298` Your test results (Score, Accuracy, Correct, Incorrect, skipped; actions Review answers · Mistake notebook · Retry as practice · Save revision set · Topic analytics · Leaderboard; Question review filters All/Incorrect/Bookmarked/Skipped; "Next study action": Reflect on my mistake, Schedule weak-topic practice, See progress) · `329:53494` Understand your answer · `336:50987` Review your calculation · `329:54866` Answer-key update · `341:55379` Report tracker |
| Collections | `329:53690` My attempts · `329:53886` Mistake notebook · `329:54082` Bookmarked questions · `329:54278` Test leaderboard · `329:54474` Weekly Prelims challenge · `329:54670` Prelims analytics |
| Formats | `329:55062` Question formats (statement combinations, matching lists, passage questions, map/image/chart with alt text) |
| All-India tests (GS Paper I / CSAT Paper II / Ranking rules; LIVE, UPCOMING, COMPLETED cards, "Full syllabus · 100 questions · 120 minutes · 200 marks", window "13 Oct 09:00 – 14 Oct 21:00 IST") | `571:85323` Tests · GS · `571:85493` CSAT · `571:85663`/`85833` Test details · `571:86003` Upcoming · `574:87371` Upcoming CSAT · `571:86173` Missed test · `571:86343`/`86513` Results provisional GS/CSAT · `571:86683` Published results · `571:86853` All India leaderboard · `571:87023` Submission pending · `571:87193` Results awaiting release |
| Guest sample | `548:85212` Sample question · `548:85216` correct · `548:85220` incorrect |

## 5. Functional requirements
**Question bank**
- FR-08-01 `[PROPOSED]` Question entity supports formats `[FIGMA]`: single-correct MCQ with statement combinations ("1 only", "2 only", "both", "neither"), matching lists (List-I/List-II codes), passage-based (shared passage across questions, CSAT), map/image/chart with caption + text alternative, numeric/calculation (CSAT) with step review ("Review your calculation").
- FR-08-02 Every question has: stem blocks, options (4), correct option, **explanation** (why correct, per-option reasoning, common misconception per distractor), syllabus mappings (subject/module/topic, GS paper, exam use), difficulty (editor-set then data-calibrated), source (`pyq` year+paper, `platform`, `ai_generated`), verification status, answer-key version history.
- FR-08-03 PYQs require verified year, paper, wording and key before attach ("Verify PYQ year, paper, wording and answer key", Mapping review). Unverified PYQs are excluded from "PYQs only" sets or labelled "pending verification" (owner to choose strictness — default: excluded).
- FR-08-04 AI-generated questions enter as `draft` in a **private pool** usable by the requesting user immediately (quota) with label "AI-generated"; they join the **shared bank only after editor approval** (D7). Each has `generation_context` (article/lesson/topic ids) and `grounding_refs`.
- FR-08-05 Answer-key corrections (`329:54866` Answer-key update): editor publishes new key version; attempts are re-scored for affected questions; students get a notification and a note on the question and results page; leaderboards re-rank per policy.
- FR-08-06 Duplicate/near-duplicate detection on upload (embedding similarity) `[PROPOSED]`.

**Practice sessions**
- FR-08-10 `[FIGMA]` Build practice: subject/topic multi-select (syllabus tree), source (platform / PYQ only / mixed / combos), count 10/20/50 (+custom `[PROPOSED]`), mode **Learning** (instant feedback after each question) vs **Test** (feedback at end), timing Timed (default 72 s/question GS, proportional) / Untimed. Pre-start screen shows availability ("12 of 20 requested available — Review practice set").
- FR-08-11 `[FIGMA]` **Adaptive set**: selection mixes difficulty by the user's recent accuracy in the topic and prioritises weak topics and due-for-revision items (12, 11); explain via "Why these questions" `[PROPOSED]`.
- FR-08-12 `[FIGMA]` Workspace: question + options, select/clear, Flag for review, Save & next, Skip, previous/next, number grid showing Answered/Flagged/Remaining, timer with warnings (5 min, 1 min), autosave answers every 5 s and on blur, resume if browser closes (same timer based on server `ends_at`), keyboard accessible (A–D, N/P/F).
- FR-08-13 Negative marking per paper config: GS Paper I +2 / −0.66 per question; CSAT +2.5 / −0.83 `[PROPOSED defaults from UPSC pattern; configurable per test]`. Learning-mode sets show accuracy only; scores computed only for configured test types. (Design sample "+1 correct" is illustrative.)
- FR-08-14 `[FIGMA]` Confidence capture (optional): after answering, "How sure are you?" (Guess / Fairly / Sure) used for analytics: *high-confidence error → revisit the concept; correct but guessed → reinforce* ("Understand your answer").
- FR-08-15 Submit confirmation lists unanswered/flagged; auto-submit at time end; double-submit idempotent.

**Results and review**
- FR-08-20 `[FIGMA]` Result summary: Score (if scored), Accuracy, Correct, Incorrect, Skipped, time taken, per-topic breakdown, comparison to previous attempt `[PROPOSED]`; "Next study action" suggestion (rules + AI): *Reflect on my mistake*, *Schedule weak-topic practice* (creates planner task, 10), *See progress*.
- FR-08-21 `[FIGMA]` Question review filters: All / Incorrect / Bookmarked / Skipped; per-question page "Understand your answer": your answer, correct answer, **Why C is correct**, **Option-by-option reasoning**, **Why B can feel convincing** (misconception), **Analyse my thinking** (optional reasoning text + reflection; AI can respond to "Ask AI about my reasoning"/"What went wrong?" — framed as "possible explanation, not an inference about your thoughts"), time spent.
- FR-08-22 `[FIGMA]` **How others answered**: percent per option and percent correct from first submitted attempts of eligible users; shown only when sample size ≥ N (default 100, "Sample-size rules" link), else "Not enough data yet".
- FR-08-23 Actions: Review answers, **Mistake notebook** (auto-add incorrect/guessed questions; filter by topic/reason; reattempt), **Retry as practice** (new set from same questions), **Save revision set** (adds to revision queue, 11), bookmark question, "Report an issue" (wrong key/typo/ambiguous -> report tracker `341:55379`), "Explanation unavailable" fallback with AI-generated explanation labelled as such.
- FR-08-24 My attempts: list of sessions with filters (type, subject, date), re-open results, compare two attempts `[PROPOSED]`.
- FR-08-25 Analytics `[FIGMA]` (`329:54670`, also in 12): accuracy by subject/topic, time per question, difficulty ladder, guess rate, retry improvement, timed vs untimed.

**Mocks and All-India tests**
- FR-08-30 `[FIGMA]` Mock tests: platform-defined full-length sets (GS 100 Q / 120 min / 200 marks; CSAT 80 Q / 120 min / 200 marks `[PROPOSED per UPSC]`), take any time; **test details** page shows syllabus coverage, question count, duration, marking, instructions; instruction screen before start.
- FR-08-31 `[FIGMA]` **All-India tests**: scheduled by admin with `window_start/end` (IST), paper (GS I / CSAT II), states LIVE / UPCOMING / COMPLETED / MISSED; single timed attempt per user within the window (start any time in window; timer fixed duration); late start allowed until `latest_start`; results released after the window closes ("Results after the participation window closes", "Results awaiting release").
- FR-08-32 `[FIGMA]` Results: **provisional** (own score immediately or after window per config) then **published** with rank (AIR), percentile, cut-off bands, topic analysis, solutions; leaderboard shows eligible attempts only per **Ranking rules** (first attempt, within window, completed ≥ min time, no integrity flags); displays handle/opt-in only (Privacy setting, 02).
- FR-08-33 `[FIGMA]` "Submission pending" (network issue; local answers cached and retried), "Missed test" (offer to attempt as practice, unranked), "Upcoming" with add-to-planner button.
- FR-08-34 `[PROPOSED]` Integrity: single active session per user, tab-visibility/blur events logged (not punitive in v1), randomised option order off (keep exam parity), rate-limited submissions.
- FR-08-35 `[FIGMA]` Weekly Prelims challenge: auto-generated 10–20 question timed set per week, community leaderboard (opt-in), badge on completion `[PROPOSED details]`.
- FR-08-36 `[PROPOSED]` Entitlements: All-India tests and full mocks may be paid (O4).

**AI generation (see §8)**
- FR-08-40 `[FIGMA hint]` "Practice MCQs" on articles/lessons/notes and "Generate MCQs" in Ask AI create a draft question set grounded in the source with a visible "AI-generated" label and "Report an issue".

## 6. Data model (module `practice`)
- `questions(id, format, stem_blocks jsonb, passage_id null, options jsonb[4], correct_option, explanation_blocks jsonb, option_reasoning jsonb, misconception jsonb, difficulty, source_type[pyq|platform|ai_generated], source_ref jsonb, pyq_year, pyq_paper, verification_status, status[draft|in_review|published|retired], created_by, version)`
- `question_versions(question_id, version, key, changed_by, reason, created_at)`
- `question_passages`, `question_assets`, `content_syllabus_map` (shared)
- `practice_sessions(id, user_id, kind[practice|pyq|mock|all_india|weekly|retry], config jsonb, test_id null, mode, timed, started_at, ends_at, submitted_at, status[in_progress|submitted|expired|abandoned], score, accuracy, summary jsonb)`
- `session_questions(session_id, ordinal, question_id, question_version)` and `answers(session_id, question_id, selected, flagged, confidence, time_ms, answered_at, reasoning_text, reflection_text, correct bool, marks)`
- `bookmarks(user_id, question_id)`, `mistake_entries(user_id, question_id, reason[incorrect|guessed|slow], first_seen, resolved_at, times_wrong)`
- `tests(id, kind[mock|all_india|weekly], paper, title, question_ids/blueprint jsonb, duration_min, total_marks, marking jsonb, window_start, window_end, latest_start, results_release_at, status, ranking_rules jsonb)`
- `test_results(test_id, user_id, session_id, raw_score, rank, percentile, eligible bool, published_at)`
- `question_stats(question_id, attempts, pct_by_option jsonb, avg_time_ms, updated_at)` (nightly + incremental)
- `issue_reports(id, user_id, entity, entity_id, type, text, status, resolved_by)`
- `ai_generation_requests(id, user_id, context_ref, params, status, question_ids, cost)`

## 7. API surface
`GET /practice/availability?subjects=&source=&count=` · `POST /practice/sessions` (config -> session) · `GET /practice/sessions/{id}` (state, remaining time, questions without keys in Test mode) · `PUT /practice/sessions/{id}/answers/{qid}` (idempotent) · `POST /practice/sessions/{id}/submit` · `GET /practice/sessions/{id}/results` · `GET /practice/questions/{id}/review?session=` · `POST /practice/questions/{id}/bookmark` · `GET /practice/mistakes` · `POST /practice/revision-sets` · `GET /practice/attempts` · `POST /practice/questions/{id}/reasoning` · `POST /practice/questions/{id}/report` · `GET /practice/analytics?from=&to=` · Tests: `GET /tests?kind=&paper=` · `GET /tests/{id}` · `POST /tests/{id}/start` · `GET /tests/{id}/leaderboard` · `GET /tests/{id}/result` · AI: `POST /practice/generate` (context + params -> job) · `GET /practice/generate/{jobId}`.
Admin: `/admin/questions` CRUD/bulk import (CSV/JSON/Word via editor), `/admin/questions/{id}/publish|retire|key`, `/admin/tests` CRUD/schedule/publish results, `/admin/reports` queue.

## 8. AI behaviour
- **`mcq_generate`** input: context (article/lesson/note/topic), count 5–20, difficulty, formats allowed, exam style (UPSC). Output JSON: stem, options, correct, per-option reasoning, misconception, syllabus nodes, `grounding_spans`. Rules: single unambiguous correct answer; statement-based formats mimic UPSC style; no facts outside grounding unless marked `general_knowledge` and then lower-confidence flagged; no copyrighted PYQ copying; dedupe against bank. Validator pass (second model or rules) checks key consistency and grounding; failing items dropped. Editors review before shared bank.
- **`explain_answer`**: grounded on question explanation + lesson text; for user-reasoning requests, responds with "possible misconception" language.
- **`next_action`**: picks weak-topic suggestions from results + progress.
- Quality targets: ≥ 95% key correctness on a human-audited sample of 200 AI MCQs before enabling shared pool; ≤ 2% reports per 1k served.

## 9. Entitlements
`practice.session` (count/day), `practice.pyq`, `practice.mock.full`, `practice.all_india`, `ai.mcq.generate` (per day/month), `practice.analytics.advanced`, `practice.mistake_notebook`. Defaults TBD (O1, O4).

## 10. Events
`question.answered`, `session.submitted`, `test.result_published`, `mistake.added`; consumers: progress (12), revision (11), planner (10), streaks/XP, notifications (result ready).

## 11. Non-functional
Answer writes p95 < 200 ms; server-authoritative timers (client clock never trusted); correct keys never sent to client in Test mode before submit; All-India start spike (e.g. 5k users in 10 min) handled via pre-warmed question payload cache; result publication is a batch job with idempotent ranking; accessibility: keyboard-only completion, screen-reader labels, text alternatives for images/charts, adjustable font size.

## 12. Edge cases
Browser crash mid-test (resume); two devices same test (single active session: second device read-only/blocked); key correction after publish; question retired mid-session (frozen version in session); user hits entitlement mid-test (allow finish); partial submissions at window close; daylight/timezone (IST fixed for All-India); ties in ranking (tie-break: higher accuracy, then less time, then earlier submission); AI set with fewer valid questions than requested (return fewer, say so).

## 13. Acceptance criteria
- Given a 20-question timed Test-mode set with 22:14 remaining, when I refresh, then the timer continues from server time and my answers/flags persist.
- Given the editor changes the key of Q7, then my past attempt's score recalculates, I'm notified, and the question page shows "Answer key updated on <date>".
- Given an All-India window open 13 Oct 09:00–14 Oct 21:00, when I start at 20:30 on 14 Oct, then I'm allowed only if `latest_start` permits and the duration is clipped per config; rank appears only after release.
- Given fewer than the minimum sample for "How others answered", then the panel shows "Not enough data yet".

## 14. Task breakdown hint
1. Question model + admin bulk import + verification states (L)
2. Session engine (create, serve, answer, timer, submit, scoring) (L)
3. Practice builder + workspace UI + review panel (L)
4. Results + review page + mistake notebook + bookmarks (M)
5. Stats pipeline (option distributions, difficulty calibration) (M)
6. Tests/mocks scheduling + All-India ranking + leaderboard (L)
7. AI generation pipeline + validator + editor approval flow (L)
8. Answer-key correction + re-scoring + notifications (M)
9. Analytics views (M, with 12)

## 15. Open questions
O1, O4; strictness for unverified PYQs; marking scheme defaults; minimum cohort size for "How others answered"; proctoring level for All-India; whether weekly challenge is free.
