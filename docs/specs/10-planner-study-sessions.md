# 10 — Home dashboard, planner, study sessions and AI weekly plan

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 02, 03, 05, 08, 09, 11, 14 | **Used by:** 12, 16
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
The daily operating system of the student: see today's plan, add/move/complete tasks tied to real content, run timed focus sessions that record *actual* study, get an AI-built realistic weekly plan, sync to Google Calendar, and see goals vs recorded effort. Home is the dashboard that surfaces the plan plus continue-learning, current affairs, revision and mentorship.

## 2. Actors
Student; AI planner (system); Mentor (feedback creates planner tasks, 16); Calendar provider (Google).

## 3. User stories
- US-10-01 On Home I see days left to Prelims/Mains, Continue learning, Today's plan with progress ("2 of 5 complete"), Today's current affairs, Revision & feedback, upcoming mentorship, this week's hours, streak/rank.
- US-10-02 I add a task with only a title; optionally subject/topic, activity type, duration, date/time, priority, linked content, reminder/repeat, notes. Without a date it goes to my backlog (Unscheduled).
- US-10-03 I see Today / Week / Month, overdue items (reschedule/skip/complete), filters, and an "Overloaded day" warning.
- US-10-04 I start a focus session from a task or lesson, pause/resume, end it, review it, and my recorded study time updates (idle time excluded).
- US-10-05 I ask AI to suggest a weekly plan given my hours, stage, priority subjects, preferred time, fixed commitments and revision/buffer, then review before adding.
- US-10-06 I set daily/weekly/monthly goals and subject targets and compare planned vs recorded.
- US-10-07 I connect Google Calendar to see/sync tasks and reminders.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Home dashboards | `7:1681` Student dashboard (concept A: "Your preparation at a glance", revision queue, My subjects, October calendar) · `89:3378` Home concept B — daily preparation (Prelims 238 days · Mains 327 days "Illustrative targets"; Continue learning cards; Today's plan; Today's current affairs; Revision and feedback; Upcoming mentorship; This week 8h20m/12h goal; Streak & study rank; "Preparation plan · Week 7") · `90:3528` Home concept B — new student / empty planner · `25:2` Reference — original dashboard (inspiration only) · `AI UPSC/Home/Task row` symbol `89:3648` |
| Planner | `128:8869` Today (stats: Planned study, Recorded study, Tasks completed; "Today's schedule" with Overdue, To do, Completed, In progress, Confirmed mentor session; right rail Unscheduled tasks, Plan ahead (Suggest weekly plan, Revision schedule), Upcoming milestone) · `196:22032` Week · `196:22180` Month · `196:22476` Goals & progress · `196:22624` Task details · `196:22772` Add task · `196:22920`-ish Edit/Reschedule · `196:23216` Reminders & recurrence · `196:23364` Calendar & reminders · `196:24252` Focus timer · `196:24548` Session review · `196:24696` Revision schedule · `196:24844` Suggested weekly plan · `196:24992` Suggested plan preview · `196:25288` Overloaded day · state frames: Today — empty, Filtered tasks, No matching tasks, Task completed/skipped/rescheduled, Task save failed, Calendar connected/sync failed/disconnected, Linked content unavailable, Previous/Next week/month, Mentor session, Economy chapter, Current affairs reading, Prelims MCQ practice, Geography maps, Essay outline, Environment notes, Full-length mock test (see index group "10 Planner / Home") · `206:29829` Flow review & handoff |
| Linked workspace updates | `130:14077`, `132:13692` Daily planner · Updated state (planner after mentor feedback tasks added) |
| Study sessions | `529:84030` Session setup · `529:84199` Active session · `529:84201` Paused · `529:84203` End session · `529:84205` Discard session · `529:84207` Session history · `529:84376` Session conflict · `529:84545` Session recovery · Focus session screen (Indian Polity · Historical Background, "Timed focus · 25 minutes", Pause/End, Open lesson/answer/Planner; previews 12m elapsed / target reached / interruption) |
| Study-session bar on reader/answer screens | Learn reader, Mains write (header "No active session / Study session") |

## 5. Functional requirements
**Tasks**
- FR-10-01 `[FIGMA]` Task fields: `title*`, `subject/topic` (syllabus node), `activity_type` (Reading, Revision, Practice MCQs, Answer writing, Current affairs, Notes, Mock test, Mentor session, Other), `duration_min`, `scheduled_at` (date/time, tz), `priority` (Low/Normal/High), `linked_content` (lesson, module, article, question set, note, mains question, mentor booking), `reminder` (e.g. 15 min before), `recurrence` (none/daily/weekly/custom, ends), `notes`, `status` (`todo|in_progress|completed|skipped|rescheduled`), `source` (`manual|ai_plan|mentor_feedback|revision|system`).
- FR-10-02 `[FIGMA]` "Only a title is required. Leave the date blank to save in your backlog" -> appears in **Unscheduled tasks**; "Open backlog" to schedule.
- FR-10-03 `[FIGMA]` Task actions: complete (optionally with actual minutes), skip, reschedule (date picker, suggestions), edit, delete (with undo), duplicate, convert to recurring, change priority.
- FR-10-04 `[FIGMA]` **Overdue** items show amber banner "Reschedule, skip or complete"; auto-roll-over is **off** by default (student chooses); end-of-day nudge `[PROPOSED]`.
- FR-10-05 `[FIGMA]` Linked content deep-links (Open lesson/answer/practice) and **auto-complete rules** `[PROPOSED]`: completing the linked lesson/question set/answer completes the task if the student confirms the prompt.
- FR-10-06 `[FIGMA]` "Overloaded day": warn when planned minutes > daily goal × 1.25 or > 12 h; suggest moving tasks.
- FR-10-07 `[FIGMA]` Views: Today, Week (7-column time-blocked), Month (heat of load + milestones), Unscheduled, Goals & progress; filters (subject, type, status, priority); empty and "No matching tasks" states; previous/next navigation.
- FR-10-08 Fixed items: mentor sessions and All-India tests appear automatically (read-only unless rescheduled in their module).
- FR-10-09 Recurrence uses an RRULE-like model; edits apply to "this / this and following / all".

**Study sessions (recorded study)**
- FR-10-20 `[FIGMA]` Start a session from any task, lesson, answer or ad hoc: choose focus length (default 25 min, presets 25/45/60/90, custom), optional task link, topic. States: `idle|running|paused|ended|discarded|recovered`.
- FR-10-21 `[FIGMA]` **Recorded study** = sum of session active time excluding idle (no interaction for > 3 min `[PROPOSED threshold]` pauses the clock with prompt) and excluding paused time; "Skipped tasks and unrecorded timer sessions do not add study time" (design copy). Study time is attributed to topic/subject via link or current page context.
- FR-10-22 `[FIGMA]` Session end: review screen (duration, target reached?, what I did, focus rating 1–5, notes), save -> optionally marks task complete.
- FR-10-23 `[FIGMA]` **Recovery/conflict**: if the browser closes mid-session, on return offer "Resume / End at last activity / Discard"; one active session per user across devices — starting another shows "Session conflict" (end the other / continue here).
- FR-10-24 `[FIGMA]` Interruptions: pause reasons (call, break), "Preview interruption" state; Pomodoro break prompts `[PROPOSED optional]`.
- FR-10-25 Session history list with filters; edit/delete a session within 24 h `[PROPOSED]`.
- FR-10-26 Ambient widget: header bar "No active session / Study session" -> running shows time; works across routes (state in server + local).

**Goals and targets**
- FR-10-30 `[FIGMA]` Goals: daily study time, weekly target (hours), monthly milestone (free text + optional date, e.g. "Finish Polity foundations by 31 October"), subject targets (weekly hours per subject). "Recorded work only" progress bars: study time, tasks completed, topic coverage ("counts topics marked complete in Modules").
- FR-10-31 `[FIGMA]` "Subject targets": planned vs recorded hours per subject for the week; "Review weekly plan", "Edit weekly subject targets".
- FR-10-32 Exam countdown: days to Prelims/Mains from official dates configured by admin (platform setting) ("Illustrative targets" must be replaced by real dates) `[PROPOSED]`.

**AI weekly plan**
- FR-10-40 `[FIGMA]` Inputs: available study time this week (hours), preparation stage (Prelims / Mains / Both), subjects to prioritise (multi), preferred study time (Morning/Afternoon/Evening/Night + tz), keep existing tasks (mentor sessions and mocks stay fixed), revision & buffer (e.g. 20% revision, 15% flexible). Actions: Generate suggestion, Plan manually, Preparation settings.
- FR-10-41 `[FIGMA]` Output preview ("Suggested plan preview"): day-by-day blocks with task, topic, duration, rationale chips ("weak topic", "revision due", "syllabus gap", "current affairs"), totals by subject vs targets; student can edit/remove/swap each task, regenerate with feedback ("less reading, more practice"), then **Add selected to planner** ("Review every suggestion before adding it").
- FR-10-42 Constraints enforced after generation (validator): total ≤ available hours; respects fixed events and daily max; ≥ required revision %; no more than 3 consecutive blocks of the same subject `[PROPOSED]`; each task linked to existing content (lesson/module/question set) or a typed generic task.
- FR-10-43 Plan inputs from system: syllabus coverage gaps, weak topics (08/12/09), revision queue (11), upcoming tests, current affairs backlog, mentor tasks.
- FR-10-44 Revision schedule view `[FIGMA]`: upcoming reviews by date from spaced repetition (11), draggable into days.
- FR-10-45 Fallback: if AI unavailable/over quota, generate a rule-based template plan; flag "Basic plan".

**Calendar**
- FR-10-50 `[FIGMA]` Google Calendar: OAuth, choose calendar, two-way sync options (one-way push default `[PROPOSED]`): tasks with times create events; changes in Google update tasks (time only); "Calendar connected / sync failed / disconnected" states; reminders via notification and calendar.
- FR-10-51 `[FIGMA]` "Calendar & reminders" settings page: reminder lead times, default task time, quiet hours link (04), timezone.

**Home**
- FR-10-60 `[FIGMA]` Dashboard widgets (config by admin flag; student can reorder `[PROPOSED]`): Countdown, Continue learning (top 4 subjects), Today's plan (top 3 + "2 of 5 complete · Open plan"), Today's current affairs (3), Revision & feedback (due flashcards, latest feedback), Upcoming mentorship (next session + "Session notes", "View booking"), This week (hours vs goal, tasks 12 of 18, streak), Streak & rank (Achievements, Leaderboard).
- FR-10-61 `[FIGMA]` New-student/empty state: onboarding-derived starter tasks, a "Finish personalising my workspace" CTA, first-study-complete celebration (`513:83234`).
- FR-10-62 `[FIGMA]` Quick links: Magazines & Resources, Acts & Bills; "Preview entry / splash" and "responsive layouts" are prototype-only controls — **not requirements**.

## 6. Data model (module `planner`)
- `tasks(id, user_id, title, subject_node_id null, activity_type, duration_min, scheduled_start null, scheduled_end null, all_day bool, priority, status, completed_at, actual_min, source, source_ref jsonb, linked jsonb, notes, recurrence_id null, series_id null, reminder jsonb, external_event_id null, created_at, updated_at, deleted_at)`
- `recurrences(id, rrule, until, exceptions jsonb)`
- `study_sessions(id, user_id, task_id null, topic_node_id null, context_ref jsonb, planned_min, started_at, ended_at, active_seconds, paused_seconds, idle_seconds, status, end_reason, focus_rating, notes, device_id)`
- `session_events(session_id, at, type[start|pause|resume|idle|interaction|end], meta)`
- `goals(user_id pk, daily_min, weekly_min, monthly_milestone text, milestone_date, subject_targets jsonb, updated_at)`
- `plan_suggestions(id, user_id, inputs jsonb, output jsonb, status[generated|edited|applied|discarded], model_version, created_at)`
- `calendar_links(user_id, provider, calendar_id, sync_mode, status, last_sync_at, sync_token)`
- `exam_dates(exam, stage, date, year, status)` (admin-managed)
Indexes: `(user_id, scheduled_start)`, `(user_id, status)`, partial index for backlog (`scheduled_start is null`), unique active session per user.

## 7. API surface
`GET /planner/today` · `GET /planner/range?from=&to=` · `GET /planner/unscheduled` · `POST/PATCH/DELETE /planner/tasks` · `POST /planner/tasks/{id}/complete|skip|reschedule` · `POST /planner/tasks/bulk` · `GET/PUT /planner/goals` · `GET /planner/progress?week=` · `POST /planner/suggest` (inputs -> suggestion) · `POST /planner/suggest/{id}/apply` · `GET /planner/revision-schedule` · Study: `POST /study-sessions` (start) · `POST /study-sessions/{id}/pause|resume|heartbeat|end|discard` · `GET /study-sessions/active` · `GET /study-sessions?from=` · Calendar: `GET /me/connections/google_calendar` · `POST /planner/calendar/sync` · `GET /home` (aggregated dashboard payload) · Admin: `/admin/exam-dates`.

## 8. AI behaviour (`plan_suggest`)
Inputs: structured constraints (above), user stage/target year, syllabus coverage and mastery by node, due revision count, upcoming fixed events, recent study patterns (hours per weekday, completion rate), current affairs backlog. Output JSON schema: array of `{date, start, duration, activity_type, syllabus_node_id, linked_content_ref|null, rationale[]}` + `totals`. Rules: be realistic (target completion rate), never exceed constraints, prefer spacing (interleaving subjects), schedule revision after learning, protect buffer, no medical/time-extreme advice. Validator enforces constraints and rejects/repairs invalid plans; deterministic rule-based fallback. Preview-first (no tasks created until applied). Log accepted vs edited tasks for quality learning.

## 9. Entitlements
`planner.basic` (free), `ai.plan.weekly` (per week quota), `planner.calendar_sync`, `study.session` (free). Defaults TBD (O1).

## 10. Events
Emits `task.created|completed|skipped|rescheduled`, `study_session.started|ended`, `plan.applied`, `goal.updated`; consumes `booking.confirmed`, `lesson.completed`, `session.submitted`, `mentor.feedback_tasks_created`, `revision.due`. Feeds progress (12) and streaks.

## 11. Non-functional
Planner reads p95 < 250 ms for a month range; study timer authoritative on server (events + heartbeat 30 s) with client display; calendar sync idempotent with `sync_token`; timezone-correct (store UTC + user tz at creation, recurrence in local time); optimistic UI with conflict detection; accessibility for drag/drop alternatives (keyboard move menu).

## 12. Edge cases
DST (India has none, but travellers); tasks spanning midnight; reschedule across timezone change; deleting a linked content item (show "Linked content unavailable"); heartbeat loss (auto-end at last heartbeat + grace); session left running overnight (cap 4 h without interaction); two devices; recurring task edited mid-series; calendar event deleted externally (mark task `external_removed`); AI plan referencing now-unpublished lesson (replace with generic task).

## 13. Acceptance criteria
- Given I add a task with only a title, then it appears in Unscheduled and not in Today; scheduling it moves it out of the backlog.
- Given I run a 25-min session with 5 min idle prompt unanswered, then recorded study = 20 min and the week bar updates accordingly.
- Given weekly capacity 24 h with 20% revision and fixed mentor session 4:30–5:15, then generated plan total ≤ 24 h, ≥ 4.8 h revision, no overlap with the session; the preview shows rationale per task and nothing is added until I apply.
- Given Google Calendar is disconnected, then planner shows "Calendar disconnected" banner with reconnect and tasks remain intact.

## 14. Task breakdown hint
1. Task CRUD + views (Today/Week/Month/Unscheduled) + recurrence (L)
2. Study session engine + widget + recovery/conflict (L)
3. Goals + progress bars + subject targets (M)
4. Home aggregation endpoint + dashboard UI (M, after other modules exist; start with stubs)
5. AI weekly plan: inputs UI, `plan_suggest`, validator, preview/apply (L)
6. Calendar sync (M)
7. Mentor-feedback/revision/test integrations (S each)
8. Overload/empty/error states + notifications (S)

## 15. Open questions
O1; idle threshold; default rollover policy; two-way calendar sync scope; official exam dates source; whether leaderboard-driving "study time" requires session recording only (proposed yes).
