# 18 — Admin console (minimal v1)

**Status:** draft — mostly `[PROPOSED]`; the owner asked for an admin side with a **minimal feature list for now** (D3) and said lessons are uploaded from admin (D5). Figma contains only a few admin-adjacent screens: Moderation queue/report/decision, Mapping review, Content status, Source details, Missing content, Mentor application/no-show views.
**Depends on:** all modules | **Used by:** operations team

## 1. Purpose
Give a small non-engineering team the tools to publish learning content, curate questions, keep AI-ingested data trustworthy, manage users/mentors/plans, moderate the community, and run payments/support — without database access. Everything is audit-logged and role-gated.

## 2. Roles and access (RBAC)
| Role | Access |
|---|---|
| `admin` | Everything, including plans, payouts, role management, settings |
| `content_editor` | Syllabus, subjects/modules/lessons, media, question bank (Prelims/Mains), rubrics, news review queue, mapping review, verification, digests, resources/Acts & Bills |
| `moderator` | Community moderation queue, appeals, restrictions (also reachable inside the student app per Figma "Moderator access required") |
| `support` `[PROPOSED]` | Support requests, user lookup (read), subscription view, impersonation **not** allowed |
| `finance` `[PROPOSED]` | Payments, refunds, payouts, reconciliation (read most, write refunds/payout holds with limits) |
Rules: least privilege; 2FA mandatory for all staff roles; sensitive actions (refund > ₹X, role change, payout release, deletion) need re-auth and reason; every write goes to `audit_log`.

## 3. Navigation (v1 minimal)
1. **Dashboard** 2. **Content** (Syllabus · Subjects & modules · Lessons · Media) 3. **Questions** (Prelims bank · Mains bank & rubrics · Tests schedule) 4. **News & sources** (Ingestion monitor · Review queue · Digests) 5. **Verification** (Mapping review · Content status) 6. **Resources & Acts** 7. **Users** 8. **Plans & entitlements** 9. **Mentors** (Applications · Mentors · Bookings/disputes) 10. **Payments** (Payments · Refunds · Payouts · Ledger) 11. **Community** (Moderation queue · Appeals · Communities) 12. **Support** 13. **AI** (Usage & cost · Reports · Prompts) 14. **Settings** (Exam dates, XP rules, feature flags, announcements) 15. **Audit log**.
**Launch-critical** (must exist before beta): 2, 3, 4 (review queue), 5, 7, 8 (basic), 11, 15, plus Support inbox. **Can follow shortly after:** Payments/payouts UI (if paid sessions launch later), AI prompts UI, announcements, advanced analytics.

## 4. Screens/features `[PROPOSED unless noted]`
| Area | Features |
|---|---|
| Dashboard | KPIs: signups, DAU/WAU, study minutes, AI usage & cost today, ingestion lag/failed items, open reports, open support, pending mentor applications, payments failed, queue sizes; health of integrations (news service, Razorpay, LiveKit, email) |
| Syllabus | Tree editor (add/rename/reorder/merge nodes), versioning, import from CSV/JSON, official-reference field |
| Subjects & modules | CRUD subjects (cover, GS paper, order, entitlement key), modules, activities (type, required, unlock rules, estimated minutes) with drag-drop ordering; publish states and schedule |
| Lessons | Block editor (heading/rich text/table/callout/image/key points/embedded question/source), video upload (direct-to-S3, transcode status, chapters, transcript editor/upload), summary, learning objective, syllabus mappings, sources & verification fields, preview as student, version history/rollback, bulk import (Markdown/CSV package) `[05]` |
| Media library | Upload/browse images, PDFs, videos; usage references; replace asset; license metadata |
| Prelims bank | Question CRUD & bulk import (CSV/JSON/Word via template), formats (statement/matching/passage/map), options, key, explanation & per-option reasoning, difficulty, syllabus mapping, PYQ metadata (year, paper), verification status, key version history, duplicate warnings; **AI draft pool** review (approve/edit/reject generated MCQs) `[08]` |
| Mains bank | Questions, directive, marks/word limit, keywords checklist, model answers, rubrics (dimensions and weights, per paper), case studies, essay topics `[09]` |
| Tests schedule | Create mocks and **All-India tests** (paper, blueprint, windows, `latest_start`, result release time, marking scheme, ranking rules), preview, publish, post-test key challenges & re-scoring, publish results `[08]` |
| News & sources | Ingestion monitor (received/enriching/needs_review/published/failed counts, dead-letter list with retry), article review queue (low-confidence mapping, missing mapping, reports from students), edit mapping/GS/subject/topic, set verification status, retract/correct; weekly/monthly digest composer and publish `[06]` |
| Mapping review `[FIGMA 513:82727]` | Queue of unverified mappings (content ↔ syllabus node, PYQ year/paper/wording/key); actions: confirm, change mapping, keep pending, reject; "Report incorrect mapping" feed from students |
| Content status `[FIGMA 513:82389, 513:82558, 513:82896]` | Dashboard of source/verification status by content type (lesson source, PYQ mapping, current affairs resource, Acts & Bills, lesson video missing), "missing content" list, source details editor (publisher, date, original link, accessed date) |
| Resources & Acts | Resource/issue upload (PDF/blocks), sections, legal records (Act/Bill status, commencement, timeline, provisions, amendments, versions, official links, verified_at) `[07]` |
| Users | Search (email, name, id), profile summary, plan/subscription, status (active/restricted/deleted_pending), roles, last activity, devices/sessions (revoke), consent history, data-export/delete requests, manual verification of email, grant overrides/comp plan (03) — **no view of private notes/answers/AI chats by default** (break-glass with reason + audit for legal/safety `[PROPOSED]`) |
| Plans & entitlements | Plans CRUD, prices (Razorpay plan sync), feature catalogue, per-plan entitlements/quotas, coupons/trials, grandfathering, preview effective entitlements for a user `[03]` |
| Mentors | Applications queue (profile, credentials viewer, KYC status, checklist, approve/reject/need info), mentor list (status, rating, sessions, no-shows, suspend/reinstate), bookings table with filters, dispute cases (evidence: attendance logs/chat), manual rebook/refund `[16]` |
| Payments | Payments & refunds tables, initiate refund (policy-assisted), payouts (schedule, run, hold/release, failed), ledger explorer, reconciliation exceptions, exports `[17]` |
| Community | Moderation queue/report/decision UI (same functions as `513:81544`–`513:82220`), appeals review (different moderator rule), communities CRUD (rules, flairs), moderator roster, banned terms list, spam filters `[15]` |
| Support | Inbox of support requests (category, status, priority, assignee, SLA), conversation thread with attachments, canned replies, link to user, status workflow (New → In progress → Waiting on user → Resolved → Closed) `[19]` |
| AI | Usage & cost by task/model/day, quotas hit, reported answers queue (Report an issue from Ask AI), prompt versions & rollout flags (read-only list v1), eval run results |
| Settings | Exam dates (Prelims/Mains official dates for countdowns), XP rules and streak thresholds, leaderboard windows, feature flags, announcements/banners (maintenance, new exam notices), email templates `[PROPOSED]` |
| Audit log | Searchable append-only log of admin/moderator actions with before/after diffs, actor, IP, reason |

## 5. Functional requirements
- FR-18-01 Separate admin web app route (`/admin`) in the same repo with role-based nav; API under `/admin/*`; mandatory 2FA (TOTP) for staff; session timeout 30 min idle.
- FR-18-02 All list pages: server-side pagination, sorting, saved filters, CSV export (with permission), bulk actions where safe.
- FR-18-03 All edits create audit entries (`who, what, entity, before, after, reason, ip, at`); critical entities support versioning/rollback (lessons, questions, plans, legal records).
- FR-18-04 Publishing workflow for content: `draft → in_review → published → archived` with reviewer ≠ author option (configurable); scheduled publish/unpublish; preview-as-student.
- FR-18-05 Verification workflow (shared): items have `verification_status` (`platform_sample|pending|verified`), `verified_by/at`, `source` fields; **only verified items** are used for grounded AI answers where the spec requires (06/07/08/14) unless flagged.
- FR-18-06 Bulk import with dry-run preview, row-level errors, idempotent re-run, and rollback of the last import.
- FR-18-07 Impersonation is **not** supported; instead "view as" read-only entitlement preview for support.
- FR-18-08 Review queues (news, mapping, AI drafts, reports, mentor applications, support) share a common queue component: assignment, lock-on-open, SLA timers, keyboard shortcuts.
- FR-18-09 Safety: destructive actions (delete lesson with progress, delete plan with subscribers, hard-delete user) are blocked or require two-person approval and show impact counts.
- FR-18-10 Integrations health page with last success timestamps and retry controls (news ingest, Razorpay webhooks, LiveKit, email provider, AI provider).
- FR-18-11 Data-subject operations: process access/deletion requests with checklists, track SLA (30 days) `[DPDP]`.
- FR-18-12 Announcements: banner to all/segment (plan, stage) with start/end, dismissible, linked to notification (04).

## 6. Data model additions
`staff_roles(user_id, role, granted_by, granted_at)` · `audit_log(id, actor_id, action, entity_type, entity_id, before jsonb, after jsonb, reason, ip, ua, at)` · `review_queue_items(id, queue, entity_type, entity_id, status, assigned_to, priority, sla_due_at, created_at, resolved_at, resolution)` · `feature_flags(key, value jsonb, rollout, updated_by)` · `announcements(id, title, body, audience jsonb, starts_at, ends_at, status)` · `import_jobs(id, kind, file_id, status, summary jsonb, created_by)` · `exam_dates` (10) · module-specific tables referenced in other specs.

## 7. API surface
`/admin/auth/*` (login+2FA), `/admin/dashboard`, `/admin/content/*`, `/admin/questions/*`, `/admin/tests/*`, `/admin/affairs/*`, `/admin/verification/*`, `/admin/resources/*`, `/admin/legal/*`, `/admin/users/*`, `/admin/plans/*`, `/admin/mentors/*`, `/admin/bookings/*`, `/admin/payments/*`, `/admin/payouts/*`, `/moderation/*` (15), `/admin/support/*`, `/admin/ai/*`, `/admin/settings/*`, `/admin/audit`. Each follows REST conventions with filtering, `?format=csv`, and idempotent imports.

## 8. AI behaviour
AI assists reviewers (suggested mappings with confidence, auto-summaries, duplicate detection, draft MCQs, draft digest) but **never publishes**; all AI suggestions are labelled and require human approval. AI usage and failures are visible in the AI section.

## 9. Entitlements
Not applicable to staff. Admin may preview any user's effective entitlements.

## 10. Events
Admin actions emit domain events where needed (`lesson.published`, `question.key_changed`, `plan.changed`, `mentor.approved`, `restriction.applied`), consumed by notifications/search/progress as in other specs.

## 11. Non-functional
Admin pages p95 < 600 ms for lists; strict CSP; no PII in URLs; export access logged; separate rate limits; backups of content before bulk imports; accessibility baseline AA; staff training doc and runbooks (support, moderation, ingestion incident, payment mismatch).

## 12. Edge cases
Two editors editing the same lesson (optimistic lock + diff merge); publishing a lesson whose syllabus node was deleted; scheduled publish during outage; bulk import partially applied; moderator reviewing own content/friends (conflict-of-interest recusal); mentor approved with expired credentials; AI drafts duplicating existing bank questions; refund > original payment; timezone of test windows (IST); role removal while user has open queue assignments (auto-unassign).

## 13. Acceptance criteria
- Given an editor uploads a lesson with a video, then the lesson shows `processing` until the transcode job completes, cannot be published without ≥ 1 syllabus mapping, and appears to students only after publish with correct section anchors.
- Given a PYQ with unverified year/paper, then it stays out of "PYQs only" sets until a content editor confirms it in Mapping review.
- Given a staff user without 2FA, then login to `/admin` is refused with enrolment prompt.
- Given an admin changes a plan's AI quota, then an audit entry records old/new values and the change takes effect within 60 s.

## 14. Task breakdown hint (build order)
1. Admin shell + RBAC + 2FA + audit log (M)
2. Syllabus + subjects/modules/lessons + media (L) — unlocks Learn
3. Question bank (Prelims) + import + verification + AI drafts review (L)
4. Review queue component + news ingestion monitor + article review (M)
5. Users + plans/entitlements + overrides (M)
6. Moderation queue + appeals + communities (M)
7. Mentor applications + bookings/disputes (M)
8. Tests/mocks scheduling + results publishing (M)
9. Support inbox (M)
10. Payments/payouts/ledger views (L, with 17)
11. Mains bank + rubrics (M)
12. Resources & Acts editors (M)
13. Dashboard, settings, announcements, AI section (M)

## 15. Open questions
Who staffs each role at launch; whether editors review each other's work; localisation of admin (English only); SSO for staff; data-access policy for support; whether moderators are staff or trusted community members (Figma has "Request moderator access").
