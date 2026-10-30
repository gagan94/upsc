# Decisions log

Single source of truth for product decisions made with the owner, and for calls made by the spec author. Update this file whenever a decision is made or reversed.

## Decided by the owner (conversation of 2026-10-26/27)

| # | Decision | Source |
|---|----------|--------|
| D1 | Product is an AI-first UPSC (Indian civil services) preparation platform for aspirants: daily planner, current affairs mapped to the real syllabus, AI MCQs, AI Mains evaluation, notes, revision, forum, mentorship. | Owner |
| D2 | Scope of the spec set = **full platform**, not only what is drawn in Figma. Gaps are designed by the spec author and marked `[PROPOSED]`. | Owner |
| D3 | Admin side is required; **minimal feature set for now**. | Owner |
| D4 | All Figma "Demo / Illustrative" labels, sample mentors, ratings and streaks are **placeholder only**. Specs describe real data. | Owner |
| D5 | **Lesson content** is authored by the owner's team and **uploaded via the admin console**. | Owner |
| D6 | **Daily news/current-affairs articles are pushed** into the platform by a **separate service** (to be built separately). This platform exposes an ingestion API; it does not scrape. | Owner |
| D7 | **Practice questions come from both** an admin-uploaded question bank **and** AI generation. | Owner |
| D8 | **AI evaluates Mains answers** (in addition to mentor and peer review, which stay distinct). | Owner |
| D9 | **Mentorship can be paid or free**: mentors set their own price (including free). Platform handles payment. | Owner |
| D10 | **Web only for v1**; a mobile app may follow later. Backend is API-first. | Owner |
| D11 | **English only for v1**; i18n-ready structure, other languages later. | Owner |
| D12 | Monetisation = **subscription with free and paid tiers**. Which feature sits in which tier is **undecided**; specs gate features by configurable entitlements. | Owner |
| D13 | Tech stack: the author proposes a sensible default (see `01-architecture.md`). | Owner |
| D14 | Project folder is `/Users/gagan-home-mac/Documents/GitHub/upsc`. Specs live in `docs/specs/`. | Owner |
| D15 | Owner confirmed the specs "look fine" (first-draft approval; spec details may still change). | Owner 2026-10-27 |
| D16 | **Learn is built last** (Phase 8); earlier phases use seeded dummy data in the real schema. | Owner |
| D17 | Solo developer now; team will grow later. Keep the **earlier stack: Next.js frontend + NestJS modular monolith** (A1/A2 unchanged). | Owner |
| D18 | **Neon Postgres, no Redis for now.** Jobs/queues via Postgres (e.g. pg-boss); quotas/counters in Postgres tables; Redis re-introduced when scale demands. | Owner |
| D19 | Demo hosting = simplest free stack; **one manual deploy per day**; **no CI/CD yet** (added in pre-launch phase). | Owner |
| D20 | **Payments, subscriptions billing and live video are deferred** (Phase 9). Demo mentorship is free with a pasted meeting link. | Owner |
| D21 | Phase order: 0 Demo shell → 1 Plan & practise → 2 Current affairs & Notes → 3 AI core → 4 Mains/revision/progress → 5 Community → 6 Mentorship (free) → 7 Mocks & reference → 8 Learn → 9 Pre-launch. See `99-roadmap.md` §2. | Owner (stack/deferrals); author (ordering within) |
| D22 | **Authentication via Supabase Auth** (email/password + Google); Neon stays the app database; API verifies Supabase JWTs and keeps roles in its own `identity.users` table. Replaces self-built sessions/Argon2id/Google OAuth from spec 02 for v1. | Owner suggestion; author recommended auth-only (not Supabase DB) |

## Calls made by the spec author (owner has not confirmed; challenge freely)

| # | Call | Reason |
|---|------|--------|
| A1 | Stack: Next.js (TypeScript) + NestJS modular monolith + PostgreSQL/pgvector + Redis (deferred, D18) + S3-compatible storage; auth via Supabase (D22); Claude API behind an internal AI gateway; Razorpay for payments/payouts; LiveKit for live sessions. | Single language, fast to build, India-friendly payments, clear path to extract services later. |
| A2 | Modular monolith first, not microservices. | Small team, one deployable, strict module boundaries keep extraction possible. |
| A3 | Entitlements are data (plan -> feature keys + quotas), checked in one place. | Plan tiers are undecided (D12). |
| A4 | Platform fee on paid mentor sessions is a configurable percentage, default to be set by owner. | Not discussed. |
| A5 | Roles: `student`, `mentor`, `moderator`, `content_editor`, `admin`. A user can be student and mentor. | Figma shows a "Mentor workspace" next to the student view and a moderation queue. |
| A6 | Phase 1: practice subjects are Prelims GS-I syllabus child nodes (level 3: Indian Polity, History, Geography, Economy, Environment, Science & Technology; CSAT keeps its own node); a question belongs to one node. | Catalog subjects overlap Mains nodes and would have merged subjects in the builder (ruling R13). |
| A7 | Phase 1: the starter plan is rule-based (no AI); recurring tasks are out of scope. | AI planning is Phase 3. |
| A8 | Phase 1: marking default for GS Paper I is +2 correct / −0.66 wrong / 0 skipped, stored per session so it can change; learning mode shows accuracy only. | Owner said "defaults"; configurable by design. |
| A9 | Phase 1: all seeded questions are labelled "Sample question" (never PYQs); exam-date countdowns are labelled "Illustrative"; "How others answered" needs ≥ 100 first attempts. | Honesty about content that is not yet real. |

## Open decisions (need the owner; not blocking spec drafts)

| # | Question | Blocks |
|---|----------|--------|
| O1 | Which features are free vs paid, and the quota numbers? | 03, all gated features |
| O2 | Platform fee % and payout schedule for mentors; refund policy for cancelled/no-show sessions. | 17 |
| O3 | Are mentors vetted manually by admin only, or also by credentials checks? (Figma has application + credentials upload.) | 16, 18 |
| O4 | Is the All-India mock test series scheduled by admin only, and is it paid? | 08 |
| O5 | Data/legal: copyright/licensing for article text from The Hindu / Indian Express / PIB is owned by the separate news service, not this platform. Confirm. | 06 |
| O6 | Brand name and domain (Figma uses "AI UPSC" as a working name). | 00, 02 |
| O7 | Offline reading: what exactly is downloadable and for which plan? (Figma has offline frames.) | 13, 06 |
| O8 | Hindi and other languages: planned timing. | future |
| O9 | Who supplies/licences Magazines & Resources and Acts & Bills content (admin upload vs separate feed)? Reuse terms for official sources. | 07 |
