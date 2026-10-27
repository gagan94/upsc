# 04 — Notifications and global search

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 02 | **Used by:** all modules (producers) · 18 (verification status)
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
Bring the right reminder or update to the student at the right time (revision due, mentor session, feedback ready, replies, achievements, security) and let them find anything they own or may study from one search box (⌘K).

## 2. Actors
Student (reads/controls notifications, searches), System (producers), Admin (broadcast announcements `[PROPOSED]`).

## 3. User stories
- US-04-01 I see a bell with an unread count and open a list of notifications; I can filter All/Unread, mark all read, search, and open notification settings.
- US-04-02 I choose which categories reach me through which channel and set quiet hours.
- US-04-03 I press ⌘K (or the search box) and search lessons, notes (including handwriting text), questions, news and forum discussions, filtered by type.
- US-04-04 When search finds nothing, I get helpful suggestions and an option to ask AI.

## 4. Screens and states
| Screen | Figma nodes |
|---|---|
| Notifications list | `308:43383` Notifications · `308:43537` Unread · `308:43691` You are all caught up · `308:43845` Loading · `308:43999` Could not load · `308:44153` Saved notifications · `308:44307` Notification preferences · bell dropdown in top bar of every screen (badge "3") |
| Search | `513:80023` Search the platform (query box, quick-chips "Search: polity / handwriting / no match", type tabs All · Lessons · Notes · Questions · News · Forum, suggested results, "View verified source status") · `513:80192` Search empty · `129:10490` Current Affairs / Search results · `155:20372` Help / Search results |
| Settings | Settings / Notifications `153:17578` (see 02) |

Notification examples shown `[FIGMA]`: "Revision reminder — Revise Fundamental Rights today at 7 pm (Planner)", "Revision is due — your due revision queue is ready", "Prepare for your mentor session", "Mentor feedback available (Ananya)", "A discussion has new replies", "Your achievements are ready to review", "Account security update — review active sessions".

## 5. Functional requirements
**Notifications**
- FR-04-01 `[FIGMA]` Each notification: id, category, title, body, deep link (`target_ref`), created_at, read_at, saved flag, source module chip (Planner/Revision/Mentor/Forum/Progress/Account).
- FR-04-02 `[FIGMA]` Bell shows unread count (cap "9+"); list supports All, Unread, Mark all read, search within notifications, Saved.
- FR-04-03 Categories `[PROPOSED]`: `study_reminder`, `revision_due`, `planner`, `current_affairs_digest`, `practice`, `mains_feedback`, `mentorship` (booking, reminder, feedback, payout), `forum` (replies, mentions, answer accepted), `progress` (achievements, weekly report), `billing`, `security` (non-optional), `product_updates`.
- FR-04-04 Channels: in-app (always), email, web push `[PROPOSED later]`. Per category per channel toggle; `security` and `billing` cannot be fully disabled.
- FR-04-05 Quiet hours and timezone-aware delivery; reminders scheduled by the producer are delivered at `deliver_at` in user tz.
- FR-04-06 De-duplication and batching: multiple replies on one thread collapse within 10 min; a daily digest option for low-priority categories `[PROPOSED]`.
- FR-04-07 Real-time delivery to open tabs via SSE/WebSocket; otherwise on next load.
- FR-04-08 Notification preferences also reachable from the list ("Preferences") and Settings.
- FR-04-09 "Could not load" and loading skeleton states; list is cursor-paginated; items auto-expire after 90 days (saved ones kept).
- FR-04-10 `[PROPOSED]` Admin broadcast (maintenance, new exam notice) with start/end and audience filter (v1.1).

**Search**
- FR-04-20 `[FIGMA]` Single endpoint searches across: lessons/modules (05), notes incl. **OCR text of handwritten pages** (13), questions/PYQs (08), news/articles (06), forum discussions (15), plus resources and Acts & Bills (07) `[PROPOSED]`, mentors `[PROPOSED]`.
- FR-04-21 Results are permission-filtered: a user only sees own notes/answers, public forum posts, content within entitlement (locked results shown with lock chip and upgrade hint `[PROPOSED]`).
- FR-04-22 Ranking: text relevance (FTS + trigram typo tolerance) with boosts for syllabus match, recency (news), and user's current subject focus. Semantic (vector) re-rank for "ask-like" queries `[PROPOSED]`.
- FR-04-23 Filters: type tabs (All · Lessons · Notes · Questions · News · Forum), GS paper, subject, date range (news), exam stage.
- FR-04-24 Each result shows type, title, breadcrumb/context ("Lesson · Indian Polity · Required learning"), and `Open` action; recent searches (per user, clearable) and suggestions `[PROPOSED]`.
- FR-04-25 `[FIGMA]` Empty state ("Search empty") offers: spelling tips, broader terms, browse syllabus, **Ask AI** (carry the query).
- FR-04-26 `[FIGMA]` "View verified source status" links to the content verification explainer (see §8 and 18): items display a **verified / pending verification** badge where relevant.
- FR-04-27 Global shortcut ⌘K / Ctrl+K opens a command palette (quick jump + search) `[FIGMA hint]`.
- FR-04-28 Search index updates within 60 s of content change; note/OCR updates within 5 min.

## 6. Data model
`notifications(id, user_id, category, title, body, target_ref jsonb, channel_state jsonb, created_at, deliver_at, read_at, saved_at, dedupe_key, expires_at)` · `notification_preferences(user_id, category, channel, enabled)` · `quiet_hours(user_id, start, end, tz)` · `push_subscriptions(...)` later · `search_documents(id, entity_type, entity_id, owner_user_id null, visibility, title, body_tsv, embedding vector null, syllabus_node_ids[], published_at, entitlement_key null, updated_at)` · `search_queries(user_id, q, created_at)` (30-day retention).

## 7. API surface
`GET /me/notifications?filter=all|unread|saved&q=&cursor=` · `POST /me/notifications/{id}/read|save` · `POST /me/notifications/read-all` · `GET /me/notifications/unread-count` · `GET/PUT /me/notification-preferences` · `GET /search?q=&type=&gs=&subject=&from=&to=&cursor=` · `GET /search/suggest?q=` · `GET /me/search/recent` · `DELETE /me/search/recent`. Realtime: `GET /me/stream` (SSE).

## 8. AI behaviour
Search suggestions and query understanding may use a small model to expand synonyms for UPSC terms (e.g. "Art 21" ↔ "Right to life") `[PROPOSED]`; not required for v1. Notification copy is templated (no free-form AI).

**Verified-source status (design principle):** "A lesson, question, news item or legal resource is marked verified only after checking the original source and its date" (`513:82389` Content status). Every content entity has `verification_status: platform_sample | pending | verified`, `verified_by`, `verified_at`, `source_url`. Search and detail pages display it; the admin console manages it (18).

## 9. Entitlements
`search.semantic` `[PROPOSED]` (boolean). Notifications are not gated except email digests `[PROPOSED]`.

## 10. Events
Consumes domain events from all modules via a mapping table `event -> category -> template`; emits `notification.sent|opened` for analytics.

## 11. Non-functional
Search p95 < 300 ms; index only what the user may see; OCR/private data never in shared index segments; email deliverability (SPF/DKIM); unsubscribe link in every non-security email; rate-limit notification creation per user to avoid floods.

## 12. Edge cases
Deep link target deleted (show "no longer available"); timezone change with scheduled reminders; user disables a category with pending scheduled notifications (cancel); content moves behind paywall after being in results; very common queries ("polity") must stay fast (cache top queries).

## 13. Acceptance criteria
- Given 3 unread notifications, when I click Mark all read, then the badge clears and list items show Read.
- Given I search "habeas" and have a handwritten note containing it (OCR), then that note appears under Notes with "Handwriting text available · Original retained".
- Given no results, then the empty state shows suggestions and "Ask AI about 'x'" which opens the Ask AI panel with the query pre-filled.

## 14. Task breakdown hint
1. Notification model + producer API + in-app list/bell + SSE (M)
2. Preferences + email channel + quiet hours + dedupe (M)
3. Search index pipeline (outbox -> `search_documents`) for lessons, questions, news, notes, forum (L)
4. Search API + ranking + permission filtering + UI (palette + page) (L)
5. Semantic re-rank + synonyms (S/M, later)

## 15. Open questions
Push notifications timing; admin broadcasts; whether mentors are searchable by students globally; O7.
