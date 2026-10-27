# 11 — Revision, flashcards and spaced repetition

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 05, 06, 08, 09, 13 | **Used by:** 10, 12, 14
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
Make recall, not just reading, the measure of learning: a spaced-repetition engine over cards created from notes, lessons, articles, mistakes and Mains weaknesses. Design principle: "Lesson completion and recall performance are tracked separately."

## 2. Actors
Student; AI (card generation, answer assessment for free-recall); Content editor (optional curated decks per module).

## 3. User stories
- US-11-01 I see "Today's review" with items due (including overdue), scheduled cards, subject recall stats, and can **Start review** or build a **Custom session**.
- US-11-02 In a recall session I read a prompt, try to answer, reveal the answer, rate how well I remembered, and the next review is scheduled accordingly; I can pause, open the source, finish early.
- US-11-03 I add a note/lesson/article/question to revision (one click) and the system creates cards (manual or AI-assisted) that I can edit.
- US-11-04 I revise mistakes (wrong PYQs, bookmarked questions, Mains weaknesses) in the same system.
- US-11-05 I see upcoming schedule, trends, and can reschedule/suspend cards; reminders appear in notifications/planner.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Revision overview ("Today's review — 3 items ready · Includes overdue"; Start review / Custom session / Filters / Upcoming schedule; Scheduled cards (e.g. "Historical reforms — recall", "Recall your handwritten page"); filters Due today · Overdue · Upcoming · All; "Mistake notebook — reattempt"; Subject recall "Indian Polity · 12 reviewed · 4 need another review"; Resume session) | `149:15678` Revision / Overview · `500:76513` Revision empty · `7:1681` dashboard widget "Your revision queue" · Home "Revision and feedback" card |
| Session | `500:76340` Notes & Revision / Revision session ("Recall session · 1 of 3 · 0 reviewed", prompt "Explain the purpose, mechanism and limits of the reform.", Reveal answer, Pause, Open source, Finish session) · `500:76342` Session recap · `479:74565` Learn / Revision session · `479:74563` Revision queue |
| Dialogs | `500:76697` Revision setup (sources: Due queue, Subject/module, Selected notes, Wrong PYQs, Bookmarked questions; size 10 items / 15 minutes; card types Mains outline, Current affairs, Cloze; Start session) · `500:76698` Card editor · `500:76699` Cards saved · `500:76700` Revision filters · `500:76701` Revision schedule · `500:76702` Pause session · `500:76703` Source unavailable · `500:76705` Source changed |
| Analytics | `513:80699` Revision trends |
| In-context | Notes editor "Add to revision" / "Save & add to revision" (`500:76336`); lesson complete "Add to revision" (05); Ask AI "Flashcards · Writ remedies" and "Planner · AI revision task added" |

## 5. Functional requirements
**Cards**
- FR-11-01 `[FIGMA]` Card types: `qa` (recall), `cloze` (fill blank), `mains_outline` (recall structure of an answer), `current_affairs` (fact + link to syllabus), `mcq_from_mistake` (re-attempt a question), `note_recall` (explain this page; includes handwritten page recall).
- FR-11-02 Each card has `front`, `back`, `source_ref` (lesson/section, note excerpt, article passage, question, answer weakness), syllabus nodes, tags, `created_by` (user|ai|editor), state (`new|learning|review|relearning|suspended|archived`), scheduling fields.
- FR-11-03 `[FIGMA]` Create from: note (selected text or whole note -> AI proposes 3–10 cards for review), lesson (editor-curated suggested cards + AI), article passage, incorrect/guessed question (auto, from mistake notebook), Mains weakness item, or manual in the **Card editor** (type, front/back, source link, schedule start).
- FR-11-04 `[FIGMA]` "Source changed" and "Source unavailable" states: card keeps its own text; banner offers "Update card from source" or "Keep as is"; unavailable sources show last snapshot.
- FR-11-05 AI-generated cards require student confirmation before they enter the schedule (bulk accept/edit); quality rules: atomic, answerable, no ambiguous pronouns, cites source span.

**Scheduling**
- FR-11-10 `[PROPOSED]` Algorithm: FSRS-style (preferred) or SM-2 variant with 4 grades: Again / Hard / Good / Easy (display labels aligned to "Forgot / Partly / Remembered / Easy"). Parameters per user adapt after ≥ 100 reviews. Initial intervals: 1d, 3d, 7d, 16d, 35d... Overdue cards prioritised by retrievability.
- FR-11-11 `[FIGMA]` Daily review limit and new-card limit configurable (default 30 reviews, 10 new) to keep sessions "manageable" (Revision setup "10 items · 15 minutes").
- FR-11-12 Lesson revision hook: completing a lesson with "Add to revision" schedules first review at +1 day; module "Revision due" surfaces in Learn (05).
- FR-11-13 Mistake cards: wrong answers return after 1/3/7 days; correct-but-guessed confidence tags give shorter first interval (08).
- FR-11-14 `[FIGMA]` Scheduling is decoupled from completion %: completing a lesson never counts as "recalled".
- FR-11-15 Reschedule a card (pick date), bury until tomorrow, suspend, or archive; bulk actions in schedule view.

**Sessions**
- FR-11-20 `[FIGMA]` Start review: builds queue from due+overdue ordered by priority (exam proximity of the topic, weakness, due age). Custom session: source (Due queue / Subject-module / Selected notes / Wrong PYQs / Bookmarked questions), size (10/20/30 or 15/30 min), card types.
- FR-11-21 `[FIGMA]` Card flow: prompt -> "Try answering before you reveal" (optional typed answer box `[PROPOSED]`) -> Reveal answer -> rate (Again/Hard/Good/Easy) -> next; progress "1 of 3 · 0 reviewed"; Pause (resume later; state kept 24 h), Open source (new panel/tab to the lesson/note passage), Finish session (summary).
- FR-11-22 `[PROPOSED]` AI-graded free recall: for `qa`/`mains_outline` the student can type an answer; AI compares to the back (rubric of key points) and suggests a grade; student confirms. Quota `ai.revision.grade`.
- FR-11-23 `[FIGMA]` Session recap: items reviewed, ratings distribution, time, streak effect, next due times, "weak topics to revisit" -> create planner task (10), "Start another batch".
- FR-11-24 Keyboard shortcuts (Space reveal, 1–4 rate, P pause).

**Overview and trends**
- FR-11-30 `[FIGMA]` Overview groups: Today's review (count incl. overdue), Scheduled cards list, Subject recall (reviewed vs "need another review"), Mistake notebook shortcut, filters (due/overdue/upcoming/all/subject/type), upcoming schedule (calendar of load next 14 days).
- FR-11-31 `[FIGMA]` Revision trends: retention rate (true retention = % Good/Easy among mature cards), reviews/day, backlog size, lapses, by subject/topic; weekly revision challenge ("Revise three weak topics this week") in Progress (12).
- FR-11-32 Planner integration: due-count appears as a daily "Revision" task suggestion; reminders (e.g. 7 pm) per Notification settings; "Revision reminder" notification (04).

## 6. Data model (module `revision`)
`cards(id, user_id, type, front_blocks, back_blocks, source_ref jsonb, source_snapshot jsonb, syllabus_node_ids[], tags[], created_by, state, created_at, updated_at, deleted_at)` · `card_schedule(card_id pk, due_at, stability, difficulty, interval_days, reps, lapses, last_reviewed_at, scheduler_version)` · `review_logs(id, card_id, user_id, rated_at, rating, time_ms, prev_state, next_due_at, session_id, device)` · `revision_sessions(id, user_id, source, config jsonb, started_at, paused_at, ended_at, status, stats jsonb)` · `session_cards(session_id, card_id, ordinal, shown_at, answered_at)` · `decks(id, owner, name, source_module_id null)` optional · `revision_prefs(user_id, daily_review_limit, new_limit, reminder_time)`.
Indexes: `(user_id, due_at)` partial where state in (learning, review, relearning).

## 7. API surface
`GET /revision/overview` · `GET /revision/queue?mode=due|custom&...` · `POST /revision/sessions` · `POST /revision/sessions/{id}/answer` (card, rating, time) · `POST /revision/sessions/{id}/pause|resume|finish` · `GET /revision/sessions/{id}/recap` · `GET/POST/PATCH/DELETE /revision/cards` · `POST /revision/cards/generate` (source_ref -> AI draft) · `POST /revision/cards/bulk` · `POST /revision/cards/{id}/reschedule|suspend|archive` · `GET /revision/schedule?from=&to=` · `GET /revision/trends` · `POST /revision/from-source` (note|lesson|article|question|mains_weakness).

## 8. AI behaviour
- `flashcards_generate`: from text span/lesson/note, output ≤ 10 atomic cards with type, front/back, source span, difficulty; dedupe vs existing cards; never invent facts; mark `needs_check` when ungrounded.
- `grade_recall` (optional): rubric-based partial credit; returns suggested rating and missing points.
- Prompt versions evaluated against editor-curated gold cards (≥ 90% acceptable without edit target).

## 9. Entitlements
`revision.basic` (free), `ai.flashcards.generate` (quota), `ai.revision.grade` (quota), `revision.analytics`. TBD (O1).

## 10. Events
Emits `revision.card_created`, `revision.reviewed`, `revision.session_finished`, `revision.due_digest_ready`; consumes `lesson.completed(add_to_revision)`, `question.answered(wrong|guessed)`, `note.saved(add_to_revision)`, `mains.evaluated(weakness)`. Streak/XP counts only completed reviews.

## 11. Non-functional
Review answer write < 150 ms; due-query uses partial index; scheduler pure and unit-tested with fixtures; offline-tolerant session (queue ratings locally, replay in order on reconnect; `scheduler_version` keeps determinism); card sizes limited (front/back ≤ 2k chars + 1 image).

## 12. Edge cases
User changes timezone (day boundary); huge backlog after absence (cap session, offer "catch-up" mode spreading overdue over days); source deleted; duplicate cards from same passage; rating mistakes (undo last rating within session); card edited after reviews (keep schedule); account deletion.

## 13. Acceptance criteria
- Given 3 due cards, when I rate "Good" on card 1, then it reappears in the interval from the scheduler (≥ 1 day), the recap shows 1 reviewed and the due count falls by 1.
- Given a lesson completed with "Add to revision", then ≥ 1 draft card set is offered for confirmation and the first review is due the next day.
- Given the source note was edited, then the card shows "Source changed" with Update/Keep options and does not alter its schedule until chosen.

## 14. Task breakdown hint
1. Card + schedule models, scheduler library + tests (M)
2. Session API/UI (reveal/rate/pause/finish/recap) (M)
3. Overview + filters + schedule view (M)
4. Create-from-source flows (note, lesson, article, question, Mains) (M)
5. AI card generation + confirmation UI (M)
6. Trends + planner/notification hooks (M)
7. AI recall grading (S, later)

## 15. Open questions
O1; algorithm choice (FSRS vs SM-2); whether cards are private only or shareable decks (v1 private); handwritten-page recall UX.
