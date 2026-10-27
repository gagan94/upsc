# 01 — Architecture (proposed)

**Status:** draft — all choices here are **author's calls** (D13/A1–A2), not owner-agreed. Change freely; downstream specs only assume the *shape* (API-first, modular, entitlement-checked, AI-gateway).
**Depends on:** 00 | **Used by:** all

## 1. Principles
1. **API-first.** The web app is one client of a documented HTTP API; a future mobile app reuses it (D10).
2. **Modular monolith.** One backend deployable, strict module boundaries (one module per spec). Cross-module calls go through module interfaces or domain events, never another module's tables.
3. **Everything gated by entitlements** via one guard (see 03).
4. **All AI through one gateway** (`ai` module): prompts, grounding, quotas, logging, safety, model routing in one place.
5. **Async by default for slow work:** AI generation, OCR, notifications, email, analytics roll-ups run on queues.
6. **i18n-ready, English-only (D11):** no hard-coded strings; locale in user profile; content tables carry a `locale` column defaulting to `en`.

## 2. Proposed stack
| Concern | Choice | Why / alternative |
|---|---|---|
| Web frontend | **Next.js (React, TypeScript)**, Tailwind, a headless component lib, TanStack Query | SSR for public pages (SEO for guest preview/blog), SPA feel for workspace. Alt: Vite SPA + separate marketing site. |
| Backend | **NestJS (TypeScript)** modular monolith, REST + OpenAPI 3, zod/class-validator | One language end to end; OpenAPI generates a typed client for web and later mobile. |
| Database | **PostgreSQL 16** (+ `pgvector`, `pg_trgm`, full-text) | Relational core; embeddings for syllabus mapping and RAG without a second store at v1. |
| Cache/queues | **Redis** + BullMQ | Rate limits, quotas counters, sessions cache, job queues. |
| Object storage | **S3-compatible** (AWS S3) + CDN | Lesson media, handwritten note images, answer uploads, mentor credentials (private bucket, signed URLs). |
| Search | Start with Postgres FTS + trigram; move to OpenSearch if needed | Keep v1 simple. |
| AI | **Anthropic Claude API** behind the internal AI gateway; model tiering (cheap model for tagging/classification, stronger model for evaluation/explanations); vision for handwriting/OCR | Model ids to be pinned in config, not code. |
| Auth | **Supabase Auth** (D22): email+password, Google, email confirmation, reset, MFA later; API verifies the Supabase JWT and keeps roles in its own `identity.users` | Less to build for a solo developer; provider-agnostic user table keeps a later swap possible. Self-built option documented in spec 02. |
| Payments | **Razorpay** (subscriptions for plans; Orders + Route for marketplace split/payouts to mentors) | India-focused; UPI/cards/netbanking. Needs KYC for mentors. |
| Live sessions | **LiveKit** (WebRTC SFU; room tokens issued by backend; chat, screen share, data channel) | Self-hostable or cloud; matches video + chat + share-screen design. Alt: Daily, 100ms. |
| Email / push | Amazon SES (transactional); web push later | Notifications 04. |
| Calendar | Google Calendar API (OAuth) | "Connected tools" in settings, planner sync. |
| Infra | AWS `ap-south-1`, containers (ECS/Fargate), Terraform, GitHub Actions CI/CD, staging + prod | Data residency in India. |
| Observability | OpenTelemetry traces, Sentry errors, structured JSON logs, product analytics (PostHog) | |

## 2a. Demo-phase deviations (owner decisions D17–D20, 2026-10-27)
Stack stays as in §2 (Next.js + NestJS modular monolith + Postgres). For the solo/demo phases only:
| Item | Demo phases | Later |
|---|---|---|
| Database | **Neon Postgres** (free) | Managed Postgres (Neon paid / RDS) |
| Cache/queues | **No Redis.** Background jobs via **pg-boss** (Postgres queue) in the API process; entitlement counters, rate limits and sessions in Postgres tables | Redis/BullMQ when load or latency requires |
| Hosting | Web on Vercel Hobby or Cloudflare Pages; API on a free Node host (e.g. Render free web service; sleeps when idle — wake it before demos) | Paid containers in `ap-south-1` |
| Deploy | Manual script, ~once a day | CI/CD (GitHub Actions) in the pre-launch phase |
| Payments / video | Deferred; mentor sessions are free with a meeting link | Razorpay + LiveKit (Phase 9) |
| AI | Real Claude calls with a spend cap + cached "demo mode" answers for scripted flows | Same, budgets per plan |
Design rule: keep Redis/queue access behind small interfaces (`QueuePort`, `CounterPort`, `RateLimitPort`) so swapping Postgres for Redis later is a localized change.

## 3. System context
```
 Browser (Next.js)  ──HTTPS──►  API (NestJS modular monolith) ──► PostgreSQL / Redis / S3
        │                         │      │       │
        │ WebRTC                  │      │       └─► AI Gateway ─► Claude API
        ▼                         │      └─► Queue workers (AI jobs, OCR, email, rollups)
     LiveKit  ◄── room tokens ────┘
                                  ▲
 News service (separate) ─ push ──┘ (Ingestion API, signed requests)
 Razorpay ◄──► payments module (webhooks)         Google (OAuth, Calendar)
```

## 4. Backend modules (1:1 with specs)
`identity` (02), `billing` (03), `notify` + `search` (04), `catalog` = syllabus + lessons (05), `affairs` (06), `resources` (07), `practice` = prelims + question bank (08), `mains` (09), `planner` (10), `revision` (11), `progress` (12), `notes` (13), `ai` + `askai` (14), `community` (15), `mentorship` (16), `payments` (17), `admin` (18), `support` (19). Shared kernel: `common` (ids, errors, pagination, events), `entitlements`, `files`.

Rules: a module owns its tables (schema prefix per module); other modules read via exposed services or events; no cross-module foreign keys except to `identity.users` and `catalog.syllabus_nodes`.

## 5. Cross-cutting design
### 5.1 Identity and roles
Roles: `student`, `mentor`, `content_editor`, `moderator`, `admin` (A5). A user can hold several. Authorisation = role check + resource ownership + entitlement check, in that order. Admin console uses the same API under `/admin/*` with role guards plus audit logging.

### 5.2 Entitlements and quotas (see 03)
A guard decorator `@RequiresEntitlement('ai.mcq.generate')` resolves the user's active plan, reads the entitlement definition (boolean / numeric limit / period), checks and increments a usage counter in Redis (durably flushed to Postgres). Returns a typed `402/429 entitlement_required | quota_exceeded` with upgrade hint that the UI turns into the designed "Daily AI allowance reached" state.

### 5.3 The syllabus spine
`syllabus_nodes` (tree, materialised path) is referenced by lessons, articles, questions, notes, tasks, flashcards, progress. AI mapping jobs propose node links (`mapping_status: suggested | confirmed | rejected`); admin "Mapping review" resolves low-confidence ones (design: "Mapping review", "Source details", "Missing content").

### 5.4 AI gateway (details in 14)
Single internal interface `ai.run(task, input, ctx)`; tasks are typed (`explain`, `mcq_generate`, `mains_evaluate`, `plan_suggest`, `map_to_syllabus`, `summarise_article`, `flashcards_generate`, `ocr_handwriting`). Each task has: prompt template version, input schema, output JSON schema (validated), model tier, token/cost budget, grounding retrieval spec, safety filters, and eval set. All calls logged (prompt hash, tokens, latency, cost, user, entitlement) with PII minimisation. Streaming to the client via SSE.

### 5.5 Ingestion API for the news service (D6)
`POST /ingest/v1/articles` (idempotent on `source` + `source_article_id`), authenticated with an HMAC-signed service credential (rotatable), accepts: source (`the_hindu|indian_express|pib|other`), url, title, published_at, author, body (licensed text or summary as the news service is permitted), language, images, optional pre-computed tags. Also `POST /ingest/v1/articles/{id}/retract`, `GET /ingest/v1/health`. On receipt: store -> enqueue `enrich` job (summary, GS paper, subject/topic, Prelims/Mains relevance, syllabus mapping via AI) -> status `published` or `needs_review`. Rate limits and payload size limits apply; dead-letter queue visible in admin. Contract versioned (`v1`); the separate service owns collection and copyright clearance (O5).

### 5.6 Files and media
Direct-to-S3 presigned upload; virus scan job; image derivatives; handwriting/answer images private by default; lesson video via HLS from object storage + CDN (start with a managed video service if volume is small; keep behind a `media` interface).

### 5.7 Events (domain events via in-process bus + outbox table)
Examples: `user.registered`, `lesson.completed`, `question.answered`, `mains.submitted`, `mains.evaluated`, `note.created`, `task.completed`, `study_session.ended`, `booking.confirmed`, `session.completed`, `payment.captured`, `post.created`, `report.filed`. Consumers: progress roll-ups, notifications, streaks/XP, revision scheduling, analytics.

### 5.8 Environments and delivery
`local` (docker-compose: pg, redis, minio, mailhog), `staging`, `prod`. Trunk-based dev, PRs run lint/typecheck/unit/integration; migrations via a tool with forward-only SQL (e.g. Drizzle/Prisma/Flyway — pick one in the first task). Feature flags (config table) for staged rollout.

## 6. Non-functional requirements (platform-wide)
| Area | Target (proposed) |
|---|---|
| Availability | 99.5% monthly for core study flows in v1; mentor sessions degrade gracefully ("Connection lost" state) |
| Performance | p95 API < 400 ms for reads (excl. AI); page LCP < 2.5 s on 4G for key pages; AI first token < 3 s |
| Scale (planning) | 50k registered, 5k DAU, 500 concurrent live-session participants at launch; design for 10x |
| Security | OWASP ASVS L2 baseline; argon2id; CSRF protection; rate limiting; signed URLs; encrypted at rest/in transit; secrets in a manager; per-user data export/delete (Privacy & data setting) |
| Privacy | DPDP Act (India) aligned: consent at signup (terms/privacy), purpose limitation, deletion on request, minimal logging of AI prompts, mentors see only student data the student shares for a booking |
| Accessibility | WCAG 2.2 AA; keyboard navigable; the design has "Appearance & accessibility" settings (text size, contrast, reduced motion) |
| Observability | Trace id on every request; SLO dashboards; alerting on ingestion lag, AI error rate, payment webhook failures |
| Data | Daily backups, PITR 7 days; soft-delete + trash for notes (design has "Notes trash"); audit log append-only |
| Cost control | Per-feature AI budgets, caching of deterministic AI outputs (e.g. article summaries), model tiering |

## 7. Repository layout (proposed)
```
upsc/
  apps/web          # Next.js
  apps/api          # NestJS modular monolith
  apps/worker       # queue consumers (same codebase as api, different entry)
  packages/api-client   # generated from OpenAPI
  packages/ui       # design system (tokens from Figma)
  packages/config, packages/eslint-config
  infra/            # Terraform, docker-compose
  docs/specs/       # these specs
```

## 8. Risks and mitigations
| Risk | Mitigation |
|---|---|
| AI hallucination in exam-critical facts | Retrieval grounding on lesson/syllabus/ingested articles; citations required; "Evidence needs checking" fallback; eval sets; human review for generated MCQs before they enter the shared bank |
| AI cost blow-up | Quotas via entitlements; caching; tiered models; per-user daily caps |
| News licensing/copyright | Owned by separate service; ingest stores only what it is permitted to; link to original source always ("Open original source") |
| Mentor payments compliance (KYC/GST/TDS) | Use Razorpay Route onboarding; finance review before launch (O2) |
| Live session reliability | LiveKit reconnect handling; fallback "reschedule/cancel with refund" flows (designed) |
| Scope size | Phased roadmap; minimal admin; build each module vertically |

## 9. Open questions
O1, O2, O5, O7 in `DECISIONS.md`. Plus: confirm hosting region and whether to self-host LiveKit.
