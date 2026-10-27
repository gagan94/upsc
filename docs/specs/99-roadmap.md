# 99 — Roadmap, task-planning guide and open decisions

**Status:** draft (phases revised 2026-10-27) | **Last updated:** 2026-10-27
Use this file to turn the specs into a backlog. Nothing here is approved by the owner yet (specs are first drafts).

## 1. How to convert specs into tasks
1. Pick a spec; read its §4 (screens) and open the listed Figma node ids (`figma/FRAME_INDEX.md`).
2. Each spec's **§14 Task breakdown hint** is the epic → task list. Create one epic per numbered item; split into vertical slices (API + UI + tests) not layers.
3. Task template: *Goal · Spec ref (`FR-NN-xx`) · Figma node ids · API endpoints · Data changes · Entitlement keys · Acceptance criteria (copy from spec §13) · Out of scope*.
4. Definition of done (every task): code + unit/integration tests; OpenAPI updated; migrations reviewed; entitlement check wired; analytics event emitted; error/empty/loading states match Figma; accessibility checks (keyboard, labels); feature behind flag if not launch-ready; docs updated.
5. Estimate in S (≤ 1 day) / M (2–3 days) / L (1–2 weeks) / XL (> 2 weeks, must be split).
6. Before building a module, resolve its listed **Open questions** (or accept the stated default and note it in `DECISIONS.md`).

## 2. Phases (revised 2026-10-27 — solo developer, demo-first, Learn last)
Planning assumptions (owner, see `DECISIONS.md` D15–D21): one developer now (team later); one manual deploy per day to a free demo stack; **Learn is built last because real content isn't ready** — earlier phases run on **seeded dummy data** that uses the same tables the real Learn will use; **payments, subscriptions billing and live video are deferred** (mentor sessions are free; a session uses a pasted meeting link); no CI/CD yet. Time estimates are rough, for one developer.

| # | Phase | ≈ Weeks | Specs / epics | Demo to stakeholders |
|---|---|---|---|---|
| 0 | **Demo shell** | 1–2 | 01 repo (`apps/web`, `apps/api`), Neon Postgres, deploy script; design tokens from Figma; 02 auth (email + Google; email verification can be switched off for demo); app shell + sidebar + stub pages per Figma; roles; 03 entitlement library + default free plan; 18 admin shell + login; **seed framework** (dummy syllabus, 2–3 subjects with lessons, ~100 MCQs, ~20 articles, sample users/mentors/posts) | Log in, click through the full product shell with dummy data on a live demo URL |
| 1 | **Plan & practise** | ~3 | 02 onboarding + settings; 10 Home, planner, tasks, study sessions, goals; 08 Prelims practice (builder, workspace, results, review, mistakes, bookmarks); 18 question-bank admin screens | New student onboards, gets a plan, studies, practises, sees results |
| 2 | **Current affairs & Notes** | ~3 | 06 ingestion API + **mock news producer script**, feed, filters, reader (block renderer reused later by Learn), bookmarks/read; 13 Notes (editor, notebooks, save passage, search); 04 search basics | Daily news mapped to syllabus; highlight a passage → note |
| 3 | **AI core** | 3–4 | 01/14 AI gateway, retrieval over seeded content, Ask AI panel + workspace, evidence rule; 08 AI MCQ generation; 10 AI weekly plan; 06 explain passage; demo-mode cached answers | Headline AI features live |
| 4 | **Mains, revision, progress** | 4–5 | 09 Mains writing + AI evaluation + rewrite (typed first, handwriting OCR second); 11 revision/flashcards; 12 progress, streaks, XP, leaderboards (seeded peers) | Write → AI feedback → rewrite → revise → progress |
| 5 | **Community** | ~3 | 15 forum, circles, peer review, messaging, moderation, appeals; 18 moderation screens | Doubt thread, peer review, moderation action |
| 6 | **Mentorship (free)** | ~3 | 16 application + admin approval, directory, availability, **free** booking, preparation, meeting-link session, feedback → planner tasks, ratings; no payments | Book mentor → prepare → feedback → planner tasks |
| 7 | **Mocks & reference** | ~3 | 08 mock tests + All-India tests + leaderboard; 07 Magazines & Resources, Acts & Bills; 04 notifications + global search complete; 19 help & support | Scheduled all-India test; reference library |
| 8 | **Learn** | ~4 | 05 syllabus editor, lesson block editor, video upload, import (admin); Learn home/subject/module/reader/video/recap, progress, locks; wire lessons into planner, practice, AI grounding, notes; load real content | Editor uploads a real lesson; student studies it end to end |
| 9 | **Pre-launch** (deferred) | — | 03 subscriptions billing; 17 payments + payouts; 16 live video (LiveKit); CI/CD; paid hosting; Redis if needed; security/DPDP review; offline reading; email notifications; monitoring | Launch readiness |

**Why seeded data works:** every earlier phase reads lessons, questions and articles from the real schema (`catalog`, `practice`, `affairs`); only the *source* of rows differs (seed script vs admin upload). Phase 8 adds authoring + the Learn UI and swaps content, with no rewrites.
Parallelisation (when more developers join): streams A (Phases 2 + 8 content), B (3 + 4 AI), C (5 + 6 community/mentors).

## 3. Cross-cutting epics (track separately)
- Design system & tokens (Figma → code), responsive layouts (390 px frames exist), accessibility.
- AI platform: gateway, prompt registry, eval harness, red-team suite, cost dashboards, safety policy.
- Content operations: syllabus seed, first content pack (lessons, PYQs, Mains rubrics), editorial guidelines, verification process.
- Data & analytics: event taxonomy, dashboards, funnels.
- Security & compliance: DPDP, threat model, pen test, backups/DR, secrets, vendor DPAs (AI provider, Razorpay, LiveKit, email).
- Legal: Terms, Privacy, community rules, mentor agreement, refund policy, GST/TDS, content licensing (O5, O9).

## 4. Risk register (top)
| Risk | Likelihood/Impact | Mitigation |
|---|---|---|
| Content not ready (lessons, PYQs, rubrics) blocks Phase 1 value | High / High | Start content pipeline now; admin tools early; seed one subject end-to-end |
| AI quality/hallucination in exam facts | Med / High | Retrieval grounding, evidence rule, eval sets, human approval for shared content |
| AI cost overrun | Med / Med | Quotas, caching, tiered models, budgets/alerts |
| News-service contract mismatch/delays | Med / High | Agree ingestion payload now; build mock producer; dead-letter + monitor |
| Mentorship payments compliance | Med / High | Legal/CA review before Phase 3; start with free sessions |
| Live video reliability | Med / Med | LiveKit managed, reconnect UX, fallback reschedule/refund |
| Scope creep (1,000+ designed states) | High / Med | Vertical slices; ship happy path + key states first; track state parity separately |
| Moderation/abuse at launch | Med / Med | Rate limits, classifiers, small invite-only beta, trained moderators |

## 5. Launch checklist (beta → GA)
Legal docs live; DPDP consent & DSR flows tested; backups restored in drill; load test (5k concurrent), All-India test dry run; AI eval thresholds met; pen-test fixed; moderator and support runbooks; payment reconciliation clean for 2 weeks; status page; analytics dashboards; content QA signed off per subject; accessibility audit; rollback plan.

## 6. Spec-to-Figma gaps to design/confirm (discovered while writing)
1. **Pricing / plan / billing / upgrade** screens (03) — none in Figma.
2. **Mentor pricing, payment step, earnings, payout, refund** screens (16/17).
3. **Admin console** (18) beyond moderation/mapping/status screens.
4. **Hindi appears in Figma** (Mains setup language chip, Ask AI "Language: Hindi", mentor languages) although v1 is English-only (D11): decide to hide the control or keep as "coming soon".
5. Several Figma controls are **prototype scaffolding, not product**: "Preview entry / splash", "Preview responsive layouts", "Explore prototype states", "Load demo feedback", "Resume paper demo", "Back to Home" buttons in many frames. Ignore in implementation.
6. Placeholder-labelled content ("Demo", "Illustrative", "Sample") must be replaced with real data (D4).
7. Exact design tokens (colour, type, spacing) — extract via Figma variables when building the design system.

## 7. Open decisions register
See `DECISIONS.md` (O1–O9). Highest priority to unblock work: **O1** (plan tiers, can be deferred via entitlements), **O5/O9** (content licensing), **O2** (mentor money rules, needed before Phase 3), **O6** (brand/domain), plus agreeing the **news-service ingestion contract** (06 §7).
