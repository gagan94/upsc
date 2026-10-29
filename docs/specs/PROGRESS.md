# Spec writing progress (resume here)

**Last updated:** 2026-10-27 (all drafts complete)
**How to resume in a new session:** read `README.md` (this folder), then `DECISIONS.md`, then pick the first `[ ]` row below, open its Figma frames (see `figma/FRAME_INDEX.md`), copy `_template.md`, write the spec, tick the row, and update "Last updated". Specs are independent files, so any order works after 00/01.

Status key: `[ ]` not started, `[~]` in progress / partial, `[x]` done (first draft complete, not yet reviewed by owner).

| # | File | Scope | Status |
|---|------|-------|--------|
| 00 | `00-overview.md` | Vision, personas, goals/non-goals, module map, glossary, build order | [x] |
| 01 | `01-architecture.md` | Proposed stack, system design, AI layer, roles, NFRs, ingestion API for news service | [x] |
| 02 | `02-auth-onboarding-profile.md` | Public pages, guest preview, signup/login/Google, onboarding, profile & settings | [x] |
| 03 | `03-subscriptions-entitlements.md` | Plans, entitlements, quotas, billing, restricted accounts | [x] |
| 04 | `04-notifications-search.md` | Notification centre/preferences, global search | [x] |
| 05 | `05-learn-content.md` | Syllabus, subjects/modules/lessons, reader/video, lesson progress | [x] |
| 06 | `06-current-affairs.md` | Feed, filters, article reader, UPSC mapping, passages to notes, digests | [x] |
| 07 | `07-resources-acts-bills.md` | Magazines & Resources, Acts & Bills, source details | [x] |
| 08 | `08-prelims-practice.md` | MCQ practice, PYQs, mocks, All-India tests, analytics, AI MCQ generation | [x] |
| 09 | `09-mains-ai-evaluation.md` | Answer writing, upload handwritten, AI evaluation, rewrite loop, essay/ethics, papers | [x] |
| 10 | `10-planner-study-sessions.md` | Home, planner, tasks, focus timer, study sessions, AI weekly plan, calendar sync | [x] |
| 11 | `11-revision-flashcards.md` | Spaced repetition, flashcards, mistake notebook | [x] |
| 12 | `12-progress-gamification.md` | Progress tabs, analytics, streaks, XP, leaderboards, achievements | [x] |
| 13 | `13-notes.md` | Notebooks, editor, handwritten OCR, annotations, offline, trash | [x] |
| 14 | `14-ask-ai.md` | Panel and workspace, context, history, quotas, safety, tools | [x] |
| 15 | `15-forum-community.md` | Forum, communities, study circles, peer review, messaging, moderation | [x] |
| 16 | `16-mentorship.md` | Directory, booking, prep, live session, feedback, mentor workspace, application | [x] |
| 17 | `17-payments-payouts.md` | Mentor session payments, free sessions, platform fee, payouts, refunds | [x] |
| 18 | `18-admin-console.md` | Minimal admin: content, questions, users, plans, mentors, moderation, ingestion | [x] |
| 19 | `19-help-support.md` | Help centre, guides, support requests | [x] |
| 20 | `20-data-model.md` | Consolidated entity list and relationships across specs | [x] |
| 99 | `99-roadmap.md` | Build phases, task-breakdown guidance, open decisions register | [x] |

## Next action
Phase 0 plan written: `docs/superpowers/plans/2026-10-27-phase-0-demo-shell.md` (15 tasks). Awaiting owner review + execution-method choice. Then write the Phase 1 plan.

## Session log
- 2026-10-27: Brainstorm done (see `DECISIONS.md`). Figma file fully indexed (`figma/FRAME_INDEX.md`, 1,041 top-level frames). Tracking files created. Spec writing started.
- 2026-10-27: All 22 spec files drafted (00–20, 99). Figma review covered ~70 key screens; remaining state variants are indexed in `figma/FRAME_INDEX.md` and referenced by node id inside each spec. Next: owner review.
- 2026-10-27: Owner approved specs as fine and revised delivery plan (Learn last, solo dev, Neon/no Redis, no CI/CD, payments+video deferred). Updated `99-roadmap.md` §2, `DECISIONS.md` D15–D21, `01-architecture.md` §2a. Next: detailed Phase 0 plan (use superpowers:writing-plans).
- 2026-10-27: Phase 0 implementation plan saved (docs/superpowers/plans/2026-10-27-phase-0-demo-shell.md).
- 2026-10-27: D22 — auth via Supabase (Neon stays app DB). Phase 0 plan rewritten (14 tasks). Spec 02 and 01 annotated.
- 2026-10-28: Phase 0 code complete on branch `phase-0-demo-shell` (14 tasks + final-review fix wave, 28 commits). Live deployment pending owner accounts (Neon, Supabase, Render, Vercel) — see `docs/demo/phase-0.md`, `docs/superpowers/phase-0-followups.md`.
