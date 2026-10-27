# Council transcript — 20261027

**Original question:** Check the architecture and verify if that's the right way to go ahead for this project. And also verify the decisions which were not made by the author.

## Framed question

DECISION: Is the proposed architecture (docs/specs/01-architecture.md) the right way to go for this project, and are the author-made (not owner-confirmed) decisions A1-A5 and the unresolved open items O1-O9 sound?

PROJECT: "AI UPSC", an AI-first web platform (English only, v1) for Indian civil-services (UPSC) aspirants. Modules (22 specs, ~300KB): Learn (admin-uploaded lessons), Current Affairs (articles PUSHED by a separate, not-yet-built news service via an ingestion API), Prelims MCQ practice (admin question bank + AI-generated), Mains answer writing with AI evaluation (typed + handwritten OCR), Planner/study sessions, Revision/flashcards (spaced repetition), Progress/gamification, Notes (incl. handwritten OCR, offline), Ask AI (RAG over syllabus/lessons/articles), Forum/communities/study circles/messaging/moderation, paid-or-free Mentorship with live video sessions, payments + mentor payouts, minimal admin console, help/support. Monetisation: free + paid subscription tiers, but WHICH features are in which tier is undecided (entitlements are data). Source: owner's Figma (1,041 frames) plus owner conversation. Full platform scope was chosen by the owner, not just what Figma shows. No code written yet; CLAUDE.md says no product code until owner approves specs and a task plan exists. Team size is not stated ("small team" assumed by author). Specs are first drafts, not reviewed by owner.

OWNER-DECIDED (D1-D14): AI-first UPSC prep; full-platform scope; minimal admin; Figma demo data is placeholder; lessons uploaded by owner's team via admin; news pushed by separate service; questions from bank AND AI generation; AI evaluates Mains; mentorship paid or free with platform handling payment; web only v1; English only v1; free+paid subscription; author proposes stack.

AUTHOR-MADE, NOT OWNER-CONFIRMED:
A1 Stack: Next.js(TS) + NestJS modular monolith + PostgreSQL(pgvector, pg_trgm, FTS) + Redis/BullMQ + S3 + Claude API behind an internal AI gateway + Razorpay (subscriptions + Route marketplace payouts) + LiveKit live video + SES + Google OIDC/Calendar + AWS ap-south-1 ECS/Fargate + Terraform + OpenTelemetry/Sentry/PostHog. Own email/password auth (Argon2id, JWT+rotating refresh) instead of managed IdP. Search: Postgres FTS first.
A2 Modular monolith, 1 module per spec (~19 modules), per-module Postgres schemas, cross-schema FKs only to users and syllabus_nodes, polymorphic (type,id) refs validated in services, domain events with outbox.
A3 Entitlements as data (plan -> feature keys + quotas), checked by one guard with Redis counters flushed to Postgres.
A4 Platform fee on mentor sessions is a configurable % (default unset).
A5 Roles: student, mentor, moderator, content_editor, admin; user may hold several.
Other author-proposed items: NFRs (99.5% availability, 5k DAU, 500 concurrent live participants at launch, p95<400ms), DPDP-aligned privacy, RLS on high-risk tables, 8-year payment retention, mandatory AI grounding + human review of AI-generated MCQs before entering the shared bank, roadmap Phases 0-4 (~3-4 wks, 8-10, 8, 10 wks, ongoing; 3 parallel streams after Phase 0), Phase 3 includes forum + mentorship + payouts.
KEY ARCHITECTURAL CLAIM: "single syllabus spine" - everything (lessons, articles, questions, notes, tasks, cards, progress) maps to canonical syllabus_nodes, with AI proposing mappings and admin reviewing low-confidence ones.

STILL OPEN (owner has not decided): O1 free vs paid features and quotas; O2 platform fee %, payout schedule, refund policy; O3 mentor vetting depth; O4 All-India mock series scheduling/paid; O5 copyright of news article text (assumed owned by the separate news service); O6 brand/domain; O7 offline reading scope; O8 Hindi timing (Figma shows Hindi controls despite D11); O9 who supplies/licences Magazines/Resources and Acts/Bills content. Also unresolved: news-service ingestion contract, content readiness (lessons, PYQs, Mains rubrics), whether to self-host LiveKit, hosting region.

TOP RISKS the specs themselves list: content not ready (High/High), AI hallucination in exam facts, AI cost, news-service contract delays, mentor payments compliance (KYC/GST/TDS), scope creep (1,000+ designed states), moderation/abuse.

WHAT'S AT STAKE: The owner is about to approve specs and a task plan; a wrong architecture or unexamined author assumption becomes expensive rework after code starts. The owner wants (1) a verdict on whether this architecture is the right path, and (2) scrutiny of every decision the author made on their own or left open.


## Advisor responses

### The Contrarian

The architecture is over-built for an unknown team with unscoped monetisation. Would not approve as written.
1. Modular monolith, ~19 modules, per-module schemas: the 1:1 spec-to-module mapping mirrors the document structure, not domain boundaries. Outbox, polymorphic refs validated only in services (no FK integrity) and per-schema ownership are heavy ceremony; polymorphic refs will rot into orphaned rows. Collapse to ~6 bounded contexts.
2. The syllabus spine is the fatal-flaw candidate. UPSC content is cross-cutting (GS papers overlap, current affairs touches 4 papers), so mapping is many-to-many and fuzzy. Admin review becomes a permanent bottleneck, wrong mappings silently corrupt progress, planner and RAG. Hard dependency on a finished, versioned syllabus taxonomy; nobody has said who owns it.
3. A5, A4 fine. A1 dangerous: own auth for a platform with minors' data, payments and DPDP obligations is a liability. Razorpay Route payouts involve KYC/GST/TDS, yet Phase 3 bundles it with forum and mentorship, the three highest-compliance features. Self-hosted LiveKit unresolved; 500 concurrent is an ops commitment.
4. A3 and O1 contradict: entitlements-as-data hides that nobody knows the tiers. Redis counters flushed to Postgres means quota drift on crashes.
5. A4/O2: a payment flow can't be finished with fee, refund and payout schedule undecided.
6. Roadmap optimistic: ~30 weeks for 22 modules plus handwritten OCR, with content readiness High/High. Features before content yield empty screens.
7. 99.5% and 5k DAU are invented.
Cut v1 hard (defer forum, messaging, mentorship payouts, offline notes). Get O1, O2, O5, O9 answered before approving.

### The First Principles Thinker

You are validating the wrong thing. The architecture is fine and almost irrelevant: a modular monolith on Postgres would survive nearly any product outcome. The real problem is that you have specified a 22-module platform before knowing whether anyone will pay for any of it.
What are we actually solving? An aspirant pays when she passes. The value is probably "practice and feedback that measurably improves my score": Prelims MCQ practice plus Mains evaluation, with the syllabus spine behind them. Forum, mentorship marketplace, payouts, live video, messaging, study circles and offline notes are separate businesses. D2 (full platform) was chosen by the owner without seeing the cost of each part.
- The 5k DAU / 500 concurrent NFRs are invented and push toward ECS, Terraform and LiveKit before any user exists.
- A3 is sound, but O1 is unresolved; metering AI cost is the actual product constraint.
- Own auth is a liability for a small team; managed IdP is cheaper.
- The spine is the one claim worth betting on, and fragile: prototype on 200 real items before committing.
- Content is the real critical path; no architecture fixes empty lessons, missing PYQs and no rubrics.
- O5 and O9 are legal blockers, not open items.
Recommendation: approve the architecture, cut v1 to Learn, MCQ, Mains evaluation, Planner and Ask AI. Mentorship, forum and payouts become Phase 5 gated on retention data. Resolve O1, O2, O5, O9 before the task plan exists.

### The Expansionist

The architecture is right, and it is too small in one place. Approve the modular monolith and add the upside before code starts.
1. The syllabus spine is the real moat: every lesson, article, MCQ, note, card and answer maps to the same node, so the platform knows each student's weak spots across all content and can build personalised daily plans. Nobody in UPSC prep does this end to end. Treat the spine as the product. Build mapping-review tooling early and keep AI confidence scores and admin corrections as proprietary training data.
2. Mains evaluation is the best revenue lever; evaluated answers, rubric and model-answer comparison feed a premium tier, a public "topper benchmark" and a mentor marketplace where mentors review AI-scored answers, which justifies Razorpay Route payouts.
3. Entitlements-as-data (A3) enables A/B pricing, an exam-season pass, cohort/institute licences, B2B2C to coaching centres. O1 is an experiment, not a blocker.
4. The news ingestion API is an asset; define the contract now.
5. The AI gateway should become a reusable internal platform: caching, cost metering, model routing. Cost control becomes a margin advantage.
6. Own auth is fine for v1; keep schema OIDC-ready for mobile and Hindi; design i18n keys now.
7. A4 (fee unset) is fine; ship the mechanism, tune against mentor supply.
Biggest undervalued item: the data the spine collects. Instrument it from day one.

### The Outsider

Reading this cold, the architecture is a sound-looking answer to a question nobody has confirmed. The scope is the problem, not the stack.
1. Nobody has said who is building this. "Small team assumed" is the most load-bearing assumption. Phases 0-4 and "3 parallel streams" mean nothing without headcount. ~19 modules, Terraform, OpenTelemetry, RLS, outbox, LiveKit, Razorpay Route and an AI gateway is a lot for a small team: right amount of machinery, or just what was familiar?
2. Phase 3 bundles forum, mentorship, live video and payouts. That is a second company: marketplace payments, KYC, GST/TDS, moderation, video infra. Why is mentorship not post-launch?
3. A1-A5 are called decisions but are proposals. The ones not cheaply reversible: own auth instead of managed IdP, Razorpay Route plus LiveKit. A3 is safest. A4 (fee unset) is not a decision at all.
4. The "single syllabus spine" is asserted, not justified. It depends on AI mapping every artifact; nothing says how mapping errors get caught or who reviews at scale.
5. The product has no content. O5, O9, lessons, PYQs, rubrics are unresolved. The High/High risk is treated as a parallel track, not a gate.
6. The NFRs (5k DAU, 99.5%) look invented.
Recommendation: do not approve as written. Confirm headcount, defer mentorship and payouts, resolve O1, O2, O5, O9 before the task plan. Stack acceptable, plan not.

### The Executor

Verdict: the stack is fine. The plan is not executable as written, because it commits to scope no small team ships. Monday morning, the first step is not "approve 22 specs". It is to cut v1 to a shippable core and get the owner to decide O1, O2 and the news contract.
1. Architecture: modular monolith on Next.js, NestJS, Postgres is boring and correct; approve it. Per-module schemas, outbox and polymorphic refs are day-one overhead: start with one schema and prefixed tables, add the outbox only where a consumer needs it (AI mapping, notifications).
2. A1: own auth is the one item to push back on (1-2 weeks plus ongoing security work); use a managed provider. Self-hosting LiveKit is premature, use LiveKit Cloud. Fargate/Terraform fine but Phase 0 shouldn't depend on them.
3. A3 is sound and cheap; build it first, because O1 being undecided is exactly why it exists. A5 fine.
4. A4/O2: "fee default unset" is a blocker. Razorpay Route payouts need KYC, GST, TDS. Defer paid mentorship and payouts out of v1.
5. Spine: riskiest dependency. Day one: hand-seeded syllabus tree, manual mappings, AI suggestions later.
6. O1, O2, the news ingestion contract and content readiness block work. O5, O7, O9 are copyright/licensing: ask the owner now. O3, O4, O6, O8 can wait.
7. Three parallel streams on an unknown team size is fiction. Ask headcount. Ship Learn, Prelims, Mains evaluation and the entitlement guard first.

## Anonymization mapping

- Response A = The Executor
- Response B = The Contrarian
- Response C = The Expansionist
- Response D = The First Principles Thinker
- Response E = The Outsider

## Peer review

**Deviation from the skill:** one peer reviewer was run instead of five, because all five would have seen identical inputs. Results are one reviewer's view.

**Reviewer 1 (sole reviewer; see note below)** — saw responses anonymized as A–E.

1. **Strongest: D (First Principles).** Reframes the question: the stack is nearly irrelevant, the real risk is building 22 modules before anyone has shown they will pay. Names a concrete v1 (Learn, MCQ, Mains evaluation, Planner, Ask AI), proposes a testable check on the spine (prototype on 200 real items), makes content the critical path, gates mentorship/payouts on retention data, and flags AI cost metering as the real constraint. A (Executor) is a close second as the most actionable (managed auth, LiveKit Cloud, hand-seeded spine, ask headcount).
2. **Biggest blind spot: C (Expansionist).** Treats the spine as a moat without asking whether AI mapping is accurate or who reviews it at scale. Calls O1 and A4 "experiments" while content, legal and payout risks go unaddressed. Endorses own auth and adds B2B2C, A/B pricing and topper benchmarks to a plan that already has too much scope. Never mentions content readiness, copyright (O5, O9) or team size.
3. **All five missed:**
   - DPDP consent and data handling as a gate (A1 puts student data in the platform's own auth).
   - AI evaluation quality for Mains: no ground truth, no inter-rater validation against human evaluators, no hallucination/liability handling.
   - Unit economics: Claude cost per evaluated answer vs. a price the market will accept.
   - Validation with real aspirants / a pilot cohort before building.
   - Who owns content and syllabus curation, and the editorial cost.
   - Distribution and acquisition against incumbents.

## Chairman synthesis

**Deviation:** synthesized by the orchestrating session rather than a separate chairman sub-agent.

### Where the Council Agrees

- **The stack is acceptable; the scope is the problem.** All five (even the Contrarian) accept Next.js/NestJS/Postgres as a modular monolith. Four of five say the plan, not the technology, is what's wrong.
- **Cut v1.** Four of five (Contrarian, First Principles, Outsider, Executor) independently say defer mentorship, payouts, forum/messaging and offline notes. The Expansionist is the only one who wants to keep them.
- **Own auth (A1) is the wrong call for a small team.** Contrarian, First Principles and Executor say use a managed IdP; Outsider flags it as hard to reverse. Self-hosted LiveKit is premature (Executor, Contrarian).
- **A3 (entitlements as data) is sound** (First Principles, Executor, Outsider, Expansionist). The Contrarian's quota-drift point is a fixable implementation detail, not a reason to drop it.
- **A4 'fee unset' is not a decision.** Payment flows with fee, refund and payout schedule undecided cannot be finished (Contrarian, Outsider, Executor).
- **Block on O1, O2, O5, O9 before the task plan exists.** Named by Contrarian, First Principles, Outsider, Executor.
- **Content is the real critical path.** No architecture fixes empty lessons, missing PYQs and no Mains rubrics (Contrarian, First Principles, Outsider).
- **The NFR numbers (5k DAU, 99.5%, 500 concurrent) are invented** and are driving infra complexity (Contrarian, First Principles, Outsider).
- **Nobody knows the team size**, yet the roadmap assumes three parallel streams (Outsider, Executor, Contrarian).

### Where the Council Clashes

- **Is the syllabus spine the moat or the fatal flaw?** Expansionist: it is the product, the thing no competitor has, treat it as proprietary data. Contrarian: UPSC content is many-to-many and fuzzy, admin review becomes a permanent bottleneck, wrong mappings silently corrupt progress, planner and RAG. First Principles sits between: the one claim worth betting on, but prototype it on 200 real items first. Both sides are right; the disagreement is about *when* to commit, not whether.
- **Is mentorship a distraction or a revenue lever?** Expansionist: Mains evaluation plus mentors reviewing AI-scored answers justifies the payouts. The other four: it is a second company with KYC, GST/TDS and live-video ops. The Expansionist's version only works *after* AI evaluation is proven good, which supports deferring it rather than building it now.
- **Is O1 (tiers/quotas) a blocker or an experiment?** Expansionist: run pricing experiments. Contrarian/First Principles/Outsider: unresolved O1 means nobody knows which AI quotas matter, and AI cost is the real constraint. Resolution: the entitlement mechanism can be built now, but the *numbers* need a unit-economics estimate first.
- **How much schema ceremony?** Contrarian: collapse ~19 modules to ~6 bounded contexts. Executor: keep the modules but use one schema and add the outbox only where needed. Neither defends per-module schemas, outbox and polymorphic refs on day one.

### Blind Spots the Council Caught

- **Mains AI evaluation quality is unvalidated.** No ground truth, no comparison against human evaluators, no liability stance on wrong feedback. This is the feature most responses want to keep, yet no one asked whether it works. (Peer review.)
- **Unit economics.** Claude cost per evaluated answer / per OCR page vs. a price Indian aspirants will pay. First Principles hinted at it; nobody computed it. (Peer review.)
- **DPDP is a gate, not a footnote.** Own auth means the platform directly holds credentials and student data; consent and deletion flows need to be tested before launch. (Peer review.)
- **No demand validation.** The whole plan assumes aspirants want an all-in-one workspace. A pilot cohort or a landing-page test is absent. (Peer review.)
- **Distribution.** UPSC prep is incumbent-dominated; there is no acquisition story. (Peer review.)
- **Who owns the syllabus tree and editorial QA?** Raised by the Contrarian for the taxonomy, broadened by peer review to all content curation cost.

### The Recommendation

- **Do not approve the specs as written. Approve the architecture shape, change four things in it, and shrink v1.**
- **Keep:** Next.js + NestJS modular monolith, Postgres (+pgvector), Redis queues, S3, AI gateway behind one interface, entitlements-as-data (A3), the roles model (A5).
- **Change:** (1) Use a managed identity provider instead of building auth (A1). (2) Use LiveKit Cloud, and defer live video with mentorship. (3) Start with one Postgres schema and prefixed tables; add outbox/events only where a consumer needs them; drop the 1:1 spec-to-module rule. (4) Replace the invented NFRs with measured ones after a beta.
- **Cut v1 to the value loop:** syllabus + Learn, Prelims MCQ practice, Mains AI evaluation (typed first), Planner, basic Ask AI, with current-affairs ingestion only if the news-service contract is agreed. Defer forum, circles, messaging, mentorship, payouts, offline notes, gamification leaderboards, calendar sync to a later phase gated on retention data. This overrides D2 (full platform) for *sequencing* only; the owner should confirm.
- **De-risk the two bets before building around them:** hand-seed the syllabus tree and map ~200 real items (manual first, AI suggestions second) to test the spine; run Mains evaluation on ~50 real answers against a human evaluator to test AI quality and cost per answer.
- **On the 'decisions not made by the author' (A1-A5, O1-O9):** A2 and A3 are sound; A5 is fine; A1 is half-wrong (auth, LiveKit hosting); A4 is a blocker, not a decision. O1, O2, O5, O9 must be answered before the task plan. O3, O4, O6, O8 can wait. O7 (offline) is moot if offline is deferred. Add three missing open items: team size/budget, DPDP gate, AI unit economics.

### The One Thing to Do First

- **Ask the owner three questions in one message:** (a) team size and runway, (b) who supplies lessons, PYQs and rubrics and by when (O5/O9 included), (c) whether v1 may be cut to Learn + MCQ + Mains evaluation + Planner + Ask AI. Every other decision, including the task plan, depends on those answers.

