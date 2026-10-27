# 19 — Help centre and support

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 02, 04 | **Used by:** 15 (appeals contact), 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
Let students find answers themselves (guides, FAQs, blogs), set up integrations, and contact support with trackable requests; give staff an inbox to resolve them.

## 2. Actors
Student/guest (read help, submit and track requests), Support staff (admin console, 18), Editors (help content).

## 3. User stories
- US-19-01 I open Help & Resources, search help ("calendar sync", "study plan"), browse Platform guides, Integration guides, Blogs & resources.
- US-19-02 I read a guide (Getting started, Modules & Notes, Current affairs, Practice & PYQs, Revision & Planner, Forum & Mentorship, Google Calendar setup, Research clipper guide, Build a weekly study routine, Use current affairs effectively, Handwritten notes & revision guide, Sources and content availability, FAQs & troubleshooting).
- US-19-03 I submit a support request (category: Platform support / Bug / Integration / Feedback), with subject, description, email and screenshot (JPG/PNG/PDF ≤ 10 MB), see validation and send-failure states, and track **My support requests** with conversation.
- US-19-04 As staff I triage and answer requests, linking the user's context (plan, recent errors) without seeing private study data.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Help home (Search help; cards Platform guides · Integration guides · Blogs & resources · Contact support · My support requests; quick links Getting started, Calendar setup, FAQs & troubleshooting, Contact by email, Handwritten notes & revision guide, Sources and content availability) | `153:16246` Help & Resources |
| Guides | `153:16394` Platform guides · `153:16542` Integration guides · `153:16690` Blogs & resources · articles `155:18558` Getting started · `155:18743` Modules & Notes · `155:18924` Current affairs · `155:19105` Practice & PYQs · `155:19286` Revision & Planner · `155:19467` Forum & Mentorship · `155:19648` Google Calendar setup · `155:19829` Research clipper guide · `155:20010` Build a weekly study routine · `155:20191` Use current affairs effectively |
| Search | `155:20372` Search results |
| Support | `153:16838` Contact support (form: Category*, Email*, Subject*, Description*, optional screenshot; "Never include passwords or sensitive documents"; Submit request, Cancel, previews for validation and send failure) · `153:16986` My support requests · `155:20520` Support request details · `155:20668` No support requests yet |
| Menu | `72:4614` Help & Resources menu (Help & Resources, Platform guides, Integration guides, Blogs & resources, Contact support, My support requests) |
| Public | `548:85236` Blog · `548:85240` Article workflow · `548:85244` Article reviews · `548:85248` Article offline · `548:85252` About · `548:85256` Contact |

## 5. Functional requirements
- FR-19-01 `[FIGMA]` Help content (guides, FAQs, blog posts) is CMS-managed in admin (Markdown/blocks, categories, tags, status, SEO fields); public blog/help articles are indexable; in-app help pages require login but guides are public `[PROPOSED]`.
- FR-19-02 `[FIGMA]` Help search across guides/FAQs/blogs with suggestions ("calendar sync", "study plan"), typo tolerance, empty state with "Contact support".
- FR-19-03 `[FIGMA]` Contextual help links from modules (e.g. Calendar setup from Planner settings, Clipper guide from Connected tools, "Sources and content availability" from Content status).
- FR-19-04 `[FIGMA]` Support request creation: category, subject (≤ 120), description (10–4,000 chars), contact email (default account email; guests must provide), optional attachment (≤ 10 MB; JPG/PNG/PDF; virus-scanned), auto-attached diagnostics `[PROPOSED]` (browser, OS, app version, route, last error id; opt-out checkbox). Validation messages; send failure retry without losing content.
- FR-19-05 `[FIGMA]` Request lifecycle visible to user: `New → In progress → Waiting on you → Resolved → Closed` with timestamps, thread messages (user and support), attachments, ability to reply and reopen within 14 days, rating of resolution `[PROPOSED]`.
- FR-19-06 Email notifications for replies; reply-by-email threading `[PROPOSED]`; notifications in-app (04).
- FR-19-07 SLAs: first response 1 business day (target), displayed in the form; priority bump for payment/mentor-session issues `[PROPOSED]`.
- FR-19-08 Spam/abuse protection: rate limit 5 requests/day/user, captcha for guests.
- FR-19-09 Appeals route: restriction appeals (15) open a specially tagged request type `appeal`.
- FR-19-10 Staff tools (in 18): inbox, assignment, canned replies, internal notes, merge duplicates, link to user/booking/payment, status/priority, export; staff cannot access private notes/answers via support.
- FR-19-11 Feedback/feature suggestions category feeds a product backlog export.

## 6. Data model (module `support`)
`help_articles(id, type[guide|faq|blog|integration], slug, title, body_blocks, category, tags[], status, published_at, author_id, seo jsonb, updated_at)` · `help_categories` · `support_requests(id, user_id null, email, category, subject, description, status, priority, assignee_id, sla_due_at, diagnostics jsonb, linked jsonb, created_at, resolved_at, rating)` · `support_messages(id, request_id, author_type[user|staff|system], author_id, body, attachments jsonb, internal bool, created_at)` · `support_attachments(file_id, request_id, scan_status)`.

## 7. API surface
`GET /help/search?q=` · `GET /help/articles?type=&category=` · `GET /help/articles/{slug}` · `POST /support/requests` · `GET /support/requests` · `GET /support/requests/{id}` · `POST /support/requests/{id}/messages|reopen|rate` · `POST /public/contact` (guest) · Admin: `/admin/help/*` (CMS) and `/admin/support/*`.

## 8. AI behaviour
`[PROPOSED]` "Ask AI about this help topic" uses help articles as retrieval corpus; suggested articles before submitting a request (deflection) based on the typed subject; AI draft replies for staff (staff-edited, never auto-sent).

## 9. Entitlements
None; priority support may be a paid-plan feature (O1).

## 10. Events
`support.request_created|replied|resolved`; notifications; analytics on top searches without results to drive content.

## 11. Non-functional
Help pages cached/CDN; support attachments private, scanned; PII minimised in diagnostics; searchable archive access-controlled; accessibility of long-form articles.

## 12. Edge cases
Guest submits then registers (link by email on verification); user deletes account with open request; attachment scan fails; duplicate requests; support replies with sensitive data (redaction hint); email bounce.

## 13. Acceptance criteria
- Given I submit a valid request, then I see a confirmation with a reference id, it appears in My support requests with status New, and I receive an email acknowledgement.
- Given a network failure on submit, then my text and attachment remain and I can retry without re-entering.
- Given I search "calendar sync" and an article exists, then it ranks first and the Contact support link remains available.

## 14. Task breakdown hint
1. Help CMS tables + admin editor + public/in-app rendering (M)
2. Help search (reuse 04 index) (S)
3. Support request submission + attachments + email (M)
4. My requests + threads + reopen (M)
5. Admin inbox + SLA + canned replies (M)
6. Contextual links + diagnostics + deflection suggestions (S)

## 15. Open questions
Support tooling build-vs-buy (Zendesk/Freshdesk integration instead of in-house inbox); support hours; languages (English v1).
