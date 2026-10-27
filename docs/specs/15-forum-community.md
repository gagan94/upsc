# 15 — Forum, communities, study circles, peer review, messaging and moderation

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 02, 03, 04, 09, 12 | **Used by:** 12, 16, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags `[FIGMA]` / `[PROPOSED]`.

## 1. Purpose
Peer learning without noise: subject communities for doubts and discussion, preparation-strategy threads, small **study circles** with shared goals, **peer review** of Mains answers, private one-to-one **messages** with safety controls, and a moderation system with reports, decisions, restrictions and appeals. Design copy: "Ask, discuss and learn with fellow aspirants"; "Be constructive. Cite sources. Search before posting."; "Your answers stay private until you explicitly share them."

## 2. Actors
| Actor | Can |
|---|---|
| Student | Join communities/circles, post, reply, vote helpful, save, share, report, peer-review, message (with privacy rules) |
| Community member with `mentor` role | Same + answer-accepting/"mentor-verified" badge `[PROPOSED]` |
| Moderator | Review reports, remove content, restrict accounts, decide appeals (UI inside the app, role-gated; "Moderator access required" for others) |
| Admin | Manage communities, flairs, rules, moderator roster, bans |

## 3. User stories
- US-15-01 I browse **For You / Following / Latest / Top / Unanswered** feeds, filter by community, search discussions, and see "Your communities" (Polity, Economy, History, Environment, Prelims, Mains, Preparation strategy) with Explore communities.
- US-15-02 I create a post: pick community, flair (Doubt · Discussion · Resource · Answer Review), title (with "View similar discussion" duplicate check), content, attach an answer/image, link a subject module; publish or save draft.
- US-15-03 I reply in threads, reply to comments, vote helpful, save, share (to circle/internal link), mark my doubt **resolved**/attach the answer, and report problems.
- US-15-04 I join/leave communities and study circles (e.g. "GS II evening circle", "Daily PYQ discussion group"), see members/goals/scheduled discussions, group ranking (12).
- US-15-05 I request/offer **peer review** of a Mains answer privately: invite a reviewer, reviewer gets a rubric form (Relevance, Structure, Evidence, Conclusion 1–5 + feedback), I see "Peer feedback".
- US-15-06 I send and receive private messages; unfamiliar users go to **Message requests** first; I control privacy and can block/report.
- US-15-07 I see **My activity** (posts, replies, saved, helpful votes, drafts).
- US-15-08 If I'm restricted I can still read permitted content and private study material and **submit an appeal**.
- US-15-09 As a moderator I process a queue of reports with context and an audit trail.

## 4. Screens and states
| Area | Figma nodes |
|---|---|
| Forum home (Messages button, Search discussions, Create post, My activity; communities list; tabs For You / Following / Latest / Top / Unanswered; posts with Comments · Save · ↑ helpful · ↓ · Share · …; right rail "Community overview": Explore communities, Study circles, rules) | `108:5339` Forum · `128:9160` Following · `128:9412` Latest · `128:9664` Top · `128:9910` Unanswered |
| Threads | `108:5841` Discussion · Constitutional remedies (Save, Share, Mark resolved, Helpful, Report; reply box "Compare scope, purpose and the court approached. Include a source."; Threaded replies · Best; Open related module) · `128:7318` Weekly revision routine · `135:20357` thread reply posted · `135:20554` thread resolved · `135:20732` routine reply posted · `135:20929` routine resolved |
| Create / compose | `108:6316` Create a post · toasts `128:9041` Reply posted · `128:9050` Doubt resolved · `128:9059` Share discussion · `128:9068` Helpful vote recorded · `128:9074` Draft saved · `128:9083` Post published · `128:9092` Peer review submitted · `128:9101` You joined Polity · `128:9110` You joined the circle · `128:9119` Answer attached · `128:9125` Discussion saved · `128:9134` Report submitted |
| Communities | `128:7759` Polity community · `128:7906` Explore communities · `134:14281` Economy · `134:14525` History · `134:14769` Environment · `134:15013` Prelims · `134:15259` Mains · `134:15505` Preparation strategy |
| Circles | `128:8053` Study circles (GS II evening circle · 12 members · Shared goals and scheduled discussions; Daily PYQ discussion group) · `128:8200` GS II evening circle · `134:15749` Daily PYQ discussion group |
| Peer review | `128:7465` Peer review · Fiscal devolution (submitted answer + rubric form) · `529:81143` Peer reviews · `529:81312` Invite reviewer · `529:81481` Review pending · `529:81650` Review workspace · `529:81652` Peer feedback · `529:81654` Review access |
| My activity | `128:7612` My activity |
| Messaging | `529:81823` Inbox (Messages: "Forum · Private one-to-one conversations"; New message / Message requests / Privacy; conversation list "Ananya Sharma · 1 unread"; "Unfamiliar users enter Message requests first"; "Your answers stay private until you explicitly share them") · `529:81992` Conversation · `529:82161` Message requests · `529:82330` New message · `529:82499` Messaging privacy · `529:82668` Message safety |
| Moderation | `513:81544` Moderation queue ("Moderator access required" for non-moderators; Learner view; Request moderator access) · `513:81713` Moderation report (Report reason: Harassment · Spam · Misinformation · No violation; decisions Keep content · Remove content · Restrict account) · `513:81882` Moderation decision · `513:82051` Restricted account ("Posting is temporarily restricted. You can still read permitted discussions and access private study material." Under review; Submit appeal; Read community rules; Contact support) · `513:82220` Appeal status |
| Mentorship cross-link | Home/Community nav; "Ask a mentor" from Ask AI |

## 5. Functional requirements
**Communities and feeds**
- FR-15-01 `[FIGMA]` Seed communities: Polity, Economy, History, Environment, Prelims, Mains, Preparation strategy (+ Geography, Science & Tech, Ethics, CSAT `[PROPOSED]`); admin can add/archive; each has description, rules, flairs, moderators, member count.
- FR-15-02 `[FIGMA]` Feed tabs: **For You** (members' communities + following + relevance by syllabus focus and weak topics `[PROPOSED]`), **Following** (users/communities/threads followed), **Latest**, **Top** (helpfulness within time window: day/week/month/all), **Unanswered** (flair Doubt without accepted/any reply). Pagination cursor; empty states.
- FR-15-03 `[FIGMA]` Search discussions (title, body, tags) with filters community/flair/answered/date; duplicate-detection suggests similar discussions while composing ("View similar discussion").
- FR-15-04 `[FIGMA]` Join/leave communities; "Your communities" side list; "You joined Polity" toast; Explore communities page with search and descriptions.

**Posts and replies**
- FR-15-10 `[FIGMA]` Post: community, flair (Doubt, Discussion, Resource, Answer Review, `Question of the day` `[PROPOSED]`), title (≤ 140), body (rich text limited: bold/italic/lists/links/code/quote), attachments (image ≤ 5 MB ×4; "Attach answer" referencing a Mains attempt/note excerpt the user explicitly shares), linked module/topic (syllabus), optional anonymous-handle posting (default handle e.g. `aspirant_arya`, real name never shown).
- FR-15-11 `[FIGMA]` Drafts autosave; "Draft saved"; edit within 30 min free, later with "edited" mark; delete own (soft delete, replies remain "deleted by author").
- FR-15-12 `[FIGMA]` Replies: threaded (depth ≤ 4), sorted Best (helpful votes + accepted + author reputation) / Newest / Oldest; **Helpful ↑** vote (one per user per item; removes with toggle), ↓ (not helpful, private to reduce pile-ons `[PROPOSED]: use "not helpful" only affects ranking, not shown count`).
- FR-15-13 `[FIGMA]` Mark resolved (author or moderator): optionally select **accepted answer**; "Doubt resolved" toast; resolved filter. "Answer attached" (author attached own Mains/notes answer).
- FR-15-14 `[FIGMA]` Save discussion (private list in My activity), Share (copy link; share into a study circle), Report (reasons: Harassment, Spam, Misinformation, Off-topic, Self-harm, Other).
- FR-15-15 `[FIGMA]` "Open related module": deep-link to linked lesson/topic.
- FR-15-16 Rate limits/anti-spam: new accounts (< 24 h or < 3 helpful) post ≤ 3/day, links limited; duplicate content detection; profanity/harassment classifier pre-screen (AI + rules) holds suspicious posts for review `[PROPOSED]`.
- FR-15-17 Notifications: reply to my post/comment, mention (@handle), accepted answer, helpful milestone (04).

**Study circles**
- FR-15-20 `[FIGMA]` A circle = small group (default max 20) with name, goal, schedule of discussions, private feed, shared resources, optional group ranking (12). Create (invite/code/open), join/leave, owner role, mute, report. "12 members · Shared goals and scheduled discussions".
- FR-15-21 Scheduled discussions (date/time, topic, link to material; reminder 15 min before) — text-based in v1; live video group sessions are a non-goal.
- FR-15-22 Circle leaderboard uses opt-in study metrics only (12).

**Peer review**
- FR-15-30 `[FIGMA]` From Mains attempt (09) a student can "Request peer review": choose circle/community post (`Answer Review` flair) or **invite specific reviewer** (by handle) — "Private peer review". Reviewer access is explicit, read-only to the submitted answer, expires (default 14 days) and can be revoked ("Review access").
- FR-15-31 `[FIGMA]` Reviewer form: Relevance, Structure, Evidence, Conclusion (1–5) + text feedback + optional span comments; Submit -> "Peer review submitted" toast; student sees aggregated "Peer feedback" (average per dimension, individual comments, reviewer handle anonymised unless they opt to reveal); review quality rating (helpful?) feeds reviewer reputation.
- FR-15-32 Peer reviews never alter AI or mentor evaluation; labelled "Peer feedback".
- FR-15-33 Review pending/expired states; reviewer reminders; limit active requests per student (3) to prevent spamming `[PROPOSED]`.

**Messaging**
- FR-15-40 `[FIGMA]` One-to-one messages from the Forum (and mentor/mentee contexts). **Unfamiliar users** (no prior relationship) land in **Message requests**; accepting creates a conversation; declining/blocking stops further attempts; first message limited to 300 chars + no links.
- FR-15-41 `[FIGMA]` Platform links can be shared (lesson, discussion, note excerpt link); answers/notes are shared only when explicitly attached and are access-controlled links ("Your answers stay private until you explicitly share them").
- FR-15-42 `[FIGMA]` Messaging privacy settings: who can message me (everyone → request, circle members only, nobody), read receipts, mute, block, delete conversation. Message safety guidance panel (don't share personal info/payments off-platform; report).
- FR-15-43 Delivery: text up to 2,000 chars, image attachments `[PROPOSED later]`; realtime via WebSocket/SSE; unread counts; moderation scan for harassment/phishing keywords; rate limit (30 msgs/min).
- FR-15-44 Message retention: until deleted by both or account deletion; reported conversations preserved for moderators with consent via the report.

**Moderation**
- FR-15-50 `[FIGMA]` Reports create a case: reporter (hidden from reported), target (post/comment/message/profile/mentor review), reason, optional note, snapshot of content (preserve audit even if deleted).
- FR-15-51 `[FIGMA]` Moderation queue (role-gated): filters (status, reason, community, age, severity), assignment, SLA timers (e.g. 24 h), bulk actions; **report page** shows content + thread context + reporter reason + history of the reported user + prior actions; reasons taxonomy: Harassment, Spam, Misinformation, plus **No violation**.
- FR-15-52 `[FIGMA]` Decisions: **Keep content** (no violation), **Remove content** (with reason template, user notified), **Restrict account** (scope: posting/replies/messages/all community; duration 24 h/7 d/30 d/permanent; reason; optional warning first) — every decision stored with moderator id, rationale, timestamps (audit log; "Preserve an audit record").
- FR-15-53 `[FIGMA]` Restricted account state: banner + dedicated page ("Posting is temporarily restricted. You can still read permitted discussions and access private study material."), status "Under review"/"Active until <date>"; **Submit appeal** (text), "Appeal status" (received, under review, upheld, reversed) with decision by a different moderator; Read community rules; Contact support (19).
- FR-15-54 `[PROPOSED]` Auto-moderation: classifier flags toxicity/spam; high-confidence spam auto-hidden pending review; users with repeated violations escalate (warning → 24 h → 7 d → permanent).
- FR-15-55 Moderator roster & permissions managed in admin (18); "Request moderator access" creates an admin request; moderators cannot act on their own content.

**Mentor interactions in forum `[PROPOSED]`**: mentor badge; mentors can be tagged to answer; "Book a session" CTA on a mentor's profile card (16).

## 6. Data model (module `community`)
- `communities(id, slug, name, description, rules, status, created_by)`; `community_members(community_id, user_id, role[member|moderator], joined_at, muted)`; `flairs(community_id, key, label)`.
- `posts(id, community_id, author_id, handle, flair, title, body_blocks, syllabus_node_id null, linked_ref jsonb, status[draft|published|hidden|removed|deleted], resolved_at, accepted_comment_id, helpful_count, comment_count, created_at, edited_at, deleted_at)`; `comments(id, post_id, parent_id, author_id, body, helpful_count, status, is_accepted, depth, created_at)`; `reactions(user_id, target_type, target_id, kind[helpful|not_helpful], created_at)`; `saved_items(user_id, target_type, target_id)`; `follows(user_id, target_type, target_id)`.
- `circles(id, name, goal, owner_id, max_members, visibility, join_code, created_at)`; `circle_members`; `circle_events(circle_id, title, starts_at, topic_ref, created_by)`.
- `peer_review_requests(id, attempt_id, requester_id, reviewer_id null, circle_or_post_ref, status[open|accepted|submitted|expired|revoked], expires_at)`; `peer_reviews(id, request_id, reviewer_id, scores jsonb, feedback, comments jsonb, submitted_at, helpful_rating)`.
- `conversations(id, kind, created_at)`; `conversation_members(conversation_id, user_id, state[active|request|declined|blocked], last_read_at)`; `messages(id, conversation_id, sender_id, body, attachment_refs, created_at, deleted_at)`; `blocks(user_id, blocked_id)`; `messaging_prefs(user_id, who_can_message, read_receipts)`.
- `reports(id, reporter_id, target_type, target_id, reason, note, snapshot jsonb, status[open|in_review|decided], assigned_to, created_at, sla_due_at)`; `moderation_decisions(id, report_id, moderator_id, decision[keep|remove|restrict], rationale, template_key, created_at)`; `restrictions(id, user_id, scope[], starts_at, ends_at, reason, decision_id, status[active|lifted|expired|appealed])`; `appeals(id, restriction_id, user_id, text, status, reviewed_by, outcome, decided_at)`; `audit_log` (shared).
Indexes: posts `(community_id, created_at desc)`, `(status, created_at)`, FTS on title/body; comments `(post_id, parent_id)`; reports `(status, sla_due_at)`.

## 7. API surface
Communities: `GET /community/communities` · `POST /community/communities/{id}/join|leave` · Feed: `GET /community/feed?tab=for_you|following|latest|top|unanswered&community=&q=&cursor=` · Posts: `POST/PATCH/DELETE /community/posts` · `GET /community/posts/{id}` (+comments) · `POST /community/posts/{id}/comments` · `POST /community/posts/{id}/resolve` · `POST /community/{target}/{id}/helpful|save|report|share` · `GET /community/similar?title=` · `GET /community/me/activity` · Circles: `GET/POST /community/circles` · `POST /community/circles/{id}/join|leave|events` · Peer review: `POST /mains/attempts/{id}/peer-review` · `GET /community/peer-reviews` · `POST /community/peer-reviews/{id}/submit|revoke` · Messaging: `GET /messages/conversations` · `POST /messages/requests` · `POST /messages/requests/{id}/accept|decline` · `GET/POST /messages/conversations/{id}/messages` · `PUT /messages/privacy` · `POST /messages/block` · Moderation (role `moderator`): `GET /moderation/queue` · `GET /moderation/reports/{id}` · `POST /moderation/reports/{id}/decide` · `POST /moderation/restrictions/{id}/lift` · `GET /moderation/appeals` · `POST /moderation/appeals/{id}/decide` · User: `POST /me/appeals` · `GET /me/restriction`.

## 8. AI behaviour
- Pre-publication screening for toxicity/spam/PII (classifier + rules; low latency); flagged items held for review, not silently deleted.
- Similar-discussion retrieval (embeddings) when composing.
- Optional "AI suggested answer" posted only on request and clearly labelled, grounded in lessons (not auto-posted) `[PROPOSED]`.
- Peer-review quality nudge: AI checks reviewer feedback is specific and respectful before submit (suggestion only).
- Never auto-ban based solely on AI output.

## 9. Entitlements
`forum.read` (free), `forum.post`, `circles.create`, `messages.send`, `peer_review.request` — defaults TBD (O1); restrictions override entitlements (03 FR-03-14).

## 10. Events
`post.created`, `comment.created`, `post.resolved`, `helpful.given`, `report.filed`, `moderation.decided`, `restriction.applied|lifted`, `peer_review.requested|submitted`, `circle.joined`; consumers: notifications, progress (community participation XP capped), search, admin dashboards.

## 11. Non-functional
Feed p95 < 400 ms; abuse resistance (rate limits, shadow-hiding spam, IP/device heuristics); privacy (handles by default, no real names; DM contents encrypted at rest; legal-hold process); audit trail immutable; GDPR/DPDP export & erasure (posts anonymised to "deleted user", not hard-deleted if replies exist); accessibility of threaded UI; moderator tooling keyboard-friendly.

## 12. Edge cases
Duplicate post spam; brigading helpful votes (weight by account age, cap per day); deleted parent comment with replies; moderator conflict of interest; appeal on an expired restriction; user restricted while owning a circle (transfer ownership); messages to a banned user; re-posting removed content; mentor/student private messaging to avoid platform payments (detect payment-solicitation phrases; policy in message safety); peer reviewer sees answer after access revoked (access check at every read).

## 13. Acceptance criteria
- Given I'm restricted from posting, then compose/reply/message controls are disabled with the restriction notice, reading and my private study features still work, and I can submit one appeal per restriction.
- Given a new user messages someone they've never interacted with, then it appears in the recipient's **Message requests** and not the inbox until accepted.
- Given a moderator selects Remove content with reason "Harassment", then the content is hidden from public views, the author is notified, the audit record stores the snapshot and rationale, and the reporter gets a generic "action taken" notice.
- Given a peer-review invite, then the reviewer can read only that answer until expiry/revocation and cannot see my other attempts.

## 14. Task breakdown hint
1. Communities, posts, comments, votes, saves, feeds, search (L)
2. Compose flows, drafts, similar-discussion, attachments (M)
3. Resolve/accept answers + notifications (S)
4. Reports + moderation queue/decision/restriction/appeal + audit (L)
5. Study circles (M)
6. Peer review (M, with 09)
7. Messaging (requests, privacy, blocks, realtime) (L)
8. Auto-moderation classifiers + anti-spam limits (M)
9. Reputation/badges (S, later)

## 15. Open questions
O1; real-name vs handle policy; whether mentors may DM students freely (proposed: only within an existing booking, else Message request); moderator hiring/training; community rules text; legal review of UGC/takedown obligations (IT Rules 2021).
