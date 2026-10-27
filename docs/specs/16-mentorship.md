# 16 — Mentorship marketplace and live sessions

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 02, 03, 04, 09, 10, 13, 15, 17 | **Used by:** 10, 17, 18
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm` (136 mentorship frames). Tags `[FIGMA]` / `[PROPOSED]`. **Paid or free sessions at the mentor's choice (D9); payments are in spec 17.** The Figma booking flow has **no price/payment step** — those are `[PROPOSED]` additions.

## 1. Purpose
Connect students with vetted mentors (educators and experienced aspirants) for 1:1 sessions such as Mains answer review, strategy, study planning and mock interviews: discover, book, prepare with shared context, meet live, receive structured feedback that turns into planner tasks, rate, and rebook. Mentors apply, get approved, manage availability and pricing, and run sessions from a mentor workspace.

## 2. Actors
| Actor | Can |
|---|---|
| Student | Search mentors, view profile, book/pay or book free, prepare, reschedule/cancel, join, rate, add feedback tasks to planner |
| Mentor (approved) | Manage profile, session types, price (₹0 = free), availability, accept/decline, view student preparation, run sessions, write feedback, see earnings (17) |
| Applicant | Submit application with credentials; track status |
| Admin | Review applications, approve/suspend mentors, handle disputes/no-shows, refunds (18) |

## 3. User stories
- US-16-01 I browse mentors with filters (search, expertise, preparation stage, language, availability) and see rating, years/experience, next available slot, and price.
- US-16-02 I open a profile, pick a session type, date/time (in my timezone), set a goal, attach preparation notes/answers, review and confirm, pay (if priced) and get confirmation + calendar entry.
- US-16-03 In **My Sessions** I see upcoming bookings (time, status, preparation progress "2 of 3 items ready"), prepare, join, reschedule, cancel, and tasks from previous sessions.
- US-16-04 Before a session I record goal, questions and attach files; I run a camera/mic check; I get reminders.
- US-16-05 In the live room I see video, chat, agenda, notes, materials, can share screen, open my submitted answer, see connection status, and end the session.
- US-16-06 After a session I read mentor feedback (went well / improve / next action + annotated answer), add next steps to Planner, save summary to Notes, open a recommended module, rate privately, optionally publish a public review, and book a follow-up.
- US-16-07 As a mentor I apply (profile, background, expertise, languages, bio, availability, upload credentials), preview and submit; after approval I manage availability, see student preparation, join, write feedback, handle no-shows, view outcomes.
- US-16-08 Free sessions: a mentor can mark any session type free (or a limited number of free slots/month) and students book without payment.

## 4. Screens and states
| Area | Figma nodes |
|---|---|
| Tabs: My Sessions · Find Mentors · Session History · Become a Mentor | all `Mentorship /` frames |
| Directory | `108:3825` Find Mentors (cards: name, ★ rating · count, role/experience, expertise tags, languages, "Next available", "View profile"; "New mentor · No ratings yet" for new) · `108:3815` mentor card symbol · filters sheet `132:14518` Directory filters |
| Profile & booking | `108:4355` Ananya Sharma (About my mentoring; student feedback "Completed-session ratings"; credentials "shown as verified only after review"; Book a session: session type + duration, date/time, Change date/time, session goal, Attach preparation notes, Continue booking) · `130:11926` Rahul Menon · `130:12220` Meera Iyer · `130:12514` Arjun Rao · `130:12808` Nisha Verma · `130:13102` Kabir Shah · `132:13444` Available times · `132:13486` Timezone · `132:13496` New York time |
| Confirm | `114:5586` Review and confirm booking · `130:12073`/`12367`/`12661`/`12955`/`13249` per-mentor confirms · confirmation toasts `132:13366`–`132:13431` |
| My Sessions (next session card with preparation status and Prepare / Join available session / Reschedule / Cancel; other bookings "Confirmed"; Tasks from previous sessions; Change timezone) | `112:4719` · `114:5780` No bookings · `130:11779` Rescheduled session · `114:6160` Cancelled session · `114:5969` Feedback pending |
| Prepare | `112:4958` Prepare Ananya session (goal, questions, attachment preview/replace, Save preparation, Test camera & microphone, Reschedule, Cancel) · `130:11338` Meera · `130:11485` Rahul · toasts `132:13504`…`132:13550` |
| Reschedule/cancel dialogs | `132:13558` Reschedule Ananya · `132:13564` rescheduled · `132:13576` Cancel · `132:13582` cancelled (+ Meera `132:13601`–`13625`, Rahul `132:13644`–`13668`) |
| Pre-join & live | `112:5186` Device check · `132:14164` Device settings · `132:14170` Mic muted · `132:14176` Camera on · `132:14182` Audio checked · `132:14192` Waiting for mentor · `112:5415` Live session (video stage, session workspace tabs Chat/Agenda/Notes/Materials, controls Mute/Camera/Share screen/Devices/End session, Open submitted answer, Connection status) · `132:14208` Connection lost · `132:14220` Call agenda · `132:14226` Call notes · `132:14235` Call materials · `132:14241` Submitted answer · `132:14250` Chat message sent · `132:14256` Screen sharing · `132:14469` Session ended · `132:14154` Notes saved |
| Feedback | `112:5661` Ananya feedback ("Mains answer review · Completed"; What went well/Improve; View annotated answer; Add next steps to Planner; Open recommended module; Save summary to Notes; rating, private feedback, Public review off, Submit mentor rating, Book follow-up) · `130:11632` Meera feedback · toasts: `132:13687` feedback tasks added · `132:13867` summary saved · `132:14040` feedback submitted · `132:14049` rating dialog · `132:14070` public review · `132:14076` annotated answer · Meera variants `132:14088`–`14142` · `132:13692` Planner updated state |
| History | `112:5901` Session History · `132:14538` History filter |
| Become a mentor | `108:4845` Become a Mentor (steps Profile → Expertise → Availability → Review; fields full name, background, expertise, languages, bio, availability, Upload photo/credentials, Preview application, Submit) · `132:14482` Credentials uploaded · `132:14489` Application preview · `130:11191` Application received |
| Mentor workspace | `130:11044` Mentor workspace (Upcoming session with Student goal; View student preparation; Join session; Write session feedback; Edit profile and availability; View application status; Student view; Manage availability; Student preparation; Session outcomes; No-show/expired) · `513:80868` Mentor availability · `513:81037` Mentor student preparation · `513:81206` Mentor outcomes · `513:81375` Mentor no-show · `132:14499` Mentor feedback editor |
| Responsive | `517:80398` Mentor call (390x844) · `523:81188` Mentor booking (390x844) · `Planner / Mentor session` `196:26768` |
| Public | `548:85232` Mentorship preview (guest) |

## 5. Functional requirements
**Directory and profiles**
- FR-16-01 `[FIGMA]` Mentor profile: name, photo, headline ("Polity educator · 6 years teaching"), expertise tags (GS paper/subject/skills such as Answer structure, Strategy, Mock interviews, Study planning, Time management), preparation stages served, languages (English, Hindi, Tamil… — **mentor session language is a filter; platform UI is English-only (D11)**), bio, session types, price/duration, rating summary ("4.8/5 · 126 ratings" from completed-session ratings only), verified-credentials badge (after admin review), next available slot (tz-aware). New mentors show "New mentor · No ratings yet".
- FR-16-02 `[FIGMA]` Search & filters: text, expertise, stage (Beginner/Preparing/Revision/Interview), language, availability (today/this week/weekend/time range), price (Free/Paid/range `[PROPOSED]`), rating, mentor type (educator/ex-aspirant/peer `[FIGMA hint: "Peer mentor"]`); sort by soonest, rating, price, relevance (matches student's weak topics `[PROPOSED]`).
- FR-16-03 `[FIGMA]` Student sees no private mentor data; mentor sees only student info the student shares for a booking (name, stage, goal, attachments, optional progress summary, linked answers).

**Booking**
- FR-16-10 `[FIGMA]` Session types set by mentor: e.g. *Mains answer review (45 min)*, *Strategy & study plan*, *Prelims strategy*, *Mock interview (60 min)*, *Doubt clearing (30 min)*; each has duration, price (≥ 0), max 1 student per slot (1:1), description, preparation requirements, optional questions.
- FR-16-11 `[FIGMA]` Slot selection from the mentor's availability (weekly recurring windows + exceptions, buffer 10 min, minimum notice default 12 h, max horizon 30 days) shown in the student's timezone ("Asia/Kolkata", "Change timezone", NYC example); conflicting slots disabled; slot is **held 10 minutes** during checkout `[PROPOSED]`.
- FR-16-12 `[FIGMA]` Booking form: session goal (required, 10–300 chars), attach preparation notes (notes, Mains attempts, PDFs; explicit consent checkbox that mentor can view), choose reminder prefs. **Review and confirm** step shows mentor, time, type, duration, goal, **price & cancellation policy** `[PROPOSED]`, "Change session details", "Confirm booking".
- FR-16-13 `[PROPOSED]` Payment (17): paid sessions require payment authorisation before confirm; free sessions skip; coupon codes; GST/receipt; on failure slot released; booking states `held → pending_payment → confirmed → completed | cancelled_by_student | cancelled_by_mentor | no_show_student | no_show_mentor | expired`.
- FR-16-14 `[FIGMA]` Confirmation toast + email + ICS invite + planner task (type Mentor session, fixed) + notification "Prepare for your mentor session" (04); mentor notified and may auto-accept (default) or manual-accept mode `[PROPOSED]`.
- FR-16-15 `[FIGMA]` Reschedule (student or mentor): allowed until T−12 h (configurable); pick new slot; both parties notified; payment carried over; reschedule limit 2 per booking; "Rescheduled session details". Cancel: reason selection; policy-based refund (17): full refund if ≥ 24 h before, 50% 12–24 h, none < 12 h `[PROPOSED defaults, O2]`; mentor cancellation always full refund + rebook offer; "Session cancelled" screen shows refund status.
- FR-16-16 Anti-circumvention: no contact details in profile/messages before booking; message safety policy; reporting (15/18).

**Preparation**
- FR-16-20 `[FIGMA]` **Prepare** page: goal, questions for mentor, attachments (preview/replace), "2 of 3 items ready" checklist (goal ✓, questions ✓, attachment ✓), Save preparation, Test camera & microphone, Reschedule, Cancel. Mentor sees preparation (read-only) under "View student preparation".
- FR-16-21 `[PROPOSED]` AI prep assistant: summarises the student's recent weaknesses/progress (only if student allows) into a mentor brief; student can edit before sharing.

**Live session (WebRTC via LiveKit, 01)**
- FR-16-30 `[FIGMA]` Join window opens 10 min before start; **Device check** (camera/mic/speaker tests, permissions help), "Waiting for mentor" state with countdown, auto-timeout handling; mentor has "Join session" in workspace.
- FR-16-31 `[FIGMA]` Room: video stage with remote and local tiles, controls (mute/unmute, camera on/off, share screen, device settings, **End session**), elapsed timer, **session workspace** tabs: **Chat** (text), **Agenda** (mentor's agenda + student goal), **Notes** (private per user, autosaved, optional shared notes), **Materials** (shared files/links incl. student's submitted answer — "Open submitted answer" opens read-only side panel with annotation for mentor), connection status indicator, "Connection lost" overlay with auto-reconnect (30 s) then fallback instructions; screen-sharing state.
- FR-16-32 `[FIGMA]` Session lifecycle: starts when both joined (or at scheduled time + 10 min grace); auto-ends at duration + 10 min; end by either side confirms "End session?"; **No-show** rules: if one party missing > 10 min after start -> mark no-show and apply policy (17); attendance logged (join/leave timestamps).
- FR-16-33 `[PROPOSED]` Recording is **off by default**; optional with explicit consent of both (not in v1). Chat transcript retained 90 days for dispute handling.
- FR-16-34 Bandwidth fallback: audio-only toggle; works on mobile web (Responsive frames `517:80398`).

**Feedback and outcomes**
- FR-16-40 `[FIGMA]` Mentor feedback editor (modal): **What went well**, **Improve**, **Next action** (+ optional annotated answer link, recommended modules/topics, tasks with due dates). Publish feedback -> student notified ("Mentor feedback available"). Mentor can save draft; deadline 48 h `[PROPOSED]`.
- FR-16-41 `[FIGMA]` Student feedback page: mentor feedback panel; **View annotated answer** (mentor comments anchored on the Mains answer, 09); **Add next steps to Planner** (creates tasks with due dates, e.g. "Rewrite constitutional remedies comparison · Due Friday"; toast "feedback tasks added" and Planner "Updated state"); **Open recommended module** (05); **Save summary to Notes** (13).
- FR-16-42 `[FIGMA]` Student rating: 1–5 stars, private feedback text, **Public review** toggle (off by default; if on, review shown on profile after moderation); "Submit mentor rating"; **Book follow-up** (prefilled mentor/type).
- FR-16-43 Ratings only from completed sessions; mentors can respond once publicly `[PROPOSED]`; abusive/fake reviews reportable; rating recalculated nightly; minimum 5 ratings before showing average `[PROPOSED]`.
- FR-16-44 History: list of past sessions with status, mentor, date, outcomes, filter (status/mentor/date/type); statuses include Completed, Feedback pending, Cancelled, Rescheduled, No-show.

**Becoming a mentor**
- FR-16-50 `[FIGMA]` 4-step application: Profile (name, photo), Expertise (background, expertise tags, languages), Availability (weekly windows + timezone), Review (preview as students see it) -> Submit; credentials upload (resume, certificates, rank letter, ID for KYC); statuses `draft|submitted|in_review|needs_info|approved|rejected|suspended`; "Application received" page with expected timeline; student account is the base — a mentor profile is an add-on.
- FR-16-51 `[PROPOSED]` Admin review checklist: identity/KYC, credential verification, sample session, policy acceptance (code of conduct, conflict-of-interest, no off-platform payments), tax/payout details (17). Credentials badge only after review ("Credentials are shown as verified only after review").
- FR-16-52 `[FIGMA]` Mentor workspace: upcoming sessions, student preparation, join, write feedback, edit profile & availability, application status, Student view (preview as student), session outcomes (completed, ratings, avg rating, feedback timeliness), no-show/expired list, earnings link (17).
- FR-16-53 Availability management `[FIGMA]` (`513:80868`): weekly template, specific-date overrides, block-outs, buffers, max sessions/day, vacation mode, timezone; changes never remove confirmed bookings (conflicts flagged).
- FR-16-54 Mentor pricing: per session type price in INR (≥ 0; min ₹99 if paid `[PROPOSED]`), "Free session" toggle, optional free first-session offer or monthly free slots; platform fee shown transparently to mentor (17).

## 6. Data model (module `mentorship`)
- `mentor_profiles(user_id pk, status, headline, bio, photo_file_id, languages[], expertise_node_ids[], expertise_tags[], stages[], mentor_type, timezone, rating_avg, rating_count, sessions_completed, verified_at, accepts_new bool, created_at)`; `mentor_applications(id, user_id, payload jsonb, status, submitted_at, reviewed_by, review_notes)`; `mentor_credentials(id, mentor_id, file_id, kind, status, verified_by)`.
- `session_types(id, mentor_id, title, description, duration_min, price_minor, currency, is_free, active, requires jsonb)`.
- `availability_rules(mentor_id, weekday, start_time, end_time, tz)`; `availability_exceptions(mentor_id, date, start, end, kind[block|extra])`; `slot_holds(id, mentor_id, start_at, student_id, expires_at)`.
- `bookings(id, student_id, mentor_id, session_type_id, start_at, end_at, tz, status, goal, price_minor, discount_minor, payment_id null, policy_snapshot jsonb, reschedule_count, created_at, cancelled_at, cancelled_by, cancel_reason)`; `booking_preparation(booking_id, goal, questions, attachments jsonb, consent_share bool, progress_summary jsonb, updated_at)`.
- `session_rooms(booking_id, provider_room, started_at, ended_at, status)`; `session_participants(booking_id, user_id, joined_at, left_at)`; `session_messages(booking_id, sender, body, at)`; `session_notes(booking_id, user_id, body, shared bool)`; `session_materials(booking_id, file_id, added_by)`.
- `mentor_feedback(booking_id pk, went_well, improve, next_action, annotations_ref, recommended_refs jsonb, tasks jsonb, published_at)`; `mentor_ratings(booking_id pk, stars, private_text, public_text, public bool, status, created_at)`.
- `no_show_cases(booking_id, party, detected_at, resolution)`.

## 7. API surface
Student: `GET /mentors?q=&expertise=&stage=&language=&available=&price=&sort=&cursor=` · `GET /mentors/{id}` · `GET /mentors/{id}/slots?from=&to=&tz=&type=` · `POST /bookings/hold` · `POST /bookings` (type, slot, goal, attachments, coupon) -> payment intent if paid · `POST /bookings/{id}/confirm` (after payment/free) · `GET /bookings?status=upcoming|history` · `GET/PUT /bookings/{id}/preparation` · `POST /bookings/{id}/reschedule` · `POST /bookings/{id}/cancel` · `POST /bookings/{id}/room-token` (join window) · `POST /bookings/{id}/messages|notes|materials` · `GET /bookings/{id}/feedback` · `POST /bookings/{id}/feedback/add-to-planner|save-to-notes` · `POST /bookings/{id}/rating`.
Mentor: `POST /mentor/application` · `GET/PUT /mentor/profile` · `GET/PUT /mentor/availability` · `GET/PUT /mentor/session-types` · `GET /mentor/bookings` · `GET /mentor/bookings/{id}/preparation` · `POST /mentor/bookings/{id}/join|feedback|report-no-show` · `GET /mentor/outcomes` · `GET /mentor/earnings` (17).
Admin: `/admin/mentors/applications`, `/admin/mentors/{id}/approve|reject|suspend`, `/admin/bookings/{id}/resolve`.

## 8. AI behaviour
Optional: prep brief generation (FR-16-21), session summary draft from mentor notes (mentor edits then publishes) `[PROPOSED]`, mentor-matching recommendations (rank by student's weak topics/stage). No AI recording/transcription in v1 (privacy). AI cannot post public reviews.

## 9. Entitlements
Mentorship booking is **not** a subscription entitlement (separate pay-per-session), but may use `mentorship.book` (to restrict restricted accounts), `mentorship.free_sessions_per_month` `[PROPOSED]` promo, and `mentor.apply`.

## 10. Events and notifications
`booking.held|confirmed|rescheduled|cancelled|completed|no_show`, `mentor_feedback.published`, `rating.submitted`, `mentor.approved`; reminders at T−24 h, T−1 h, T−10 min (email + in-app); mentor reminders; feedback-pending nudges; planner task creation; progress XP minor.

## 11. Non-functional
Slot booking race-safe (unique constraint + transaction); timezone correctness (store UTC + tz ids; test with DST zones for NYC example); room tokens short-lived (10 min) and scoped; capacity: 200 concurrent rooms at launch; TURN servers for restricted networks; privacy (mentor can't download student files without permission, watermark `[PROPOSED]`); accessibility (captions off in v1; keyboard controls); data retention for chat/notes 90 days post-session unless dispute.

## 12. Edge cases
Both parties late/early; student joins from two devices; mentor changes availability after booking; payment succeeds but slot expired (auto-refund + apology); mentor approved but no availability; student deletes shared attachment after booking (mentor retains view until session end); timezone change mid-booking; connection lost > 5 min (resume/reschedule at no penalty; partial refund policy); suspended mentor with future bookings (cancel & refund & notify); duplicate booking same slot; mentor with free sessions abused by no-shows (limits per student); minor-age users (18+ policy `[PROPOSED]`).

## 13. Acceptance criteria
- Given a mentor free window Tue 18:30–19:15 IST, when a student in New York views slots, then it is shown as Tue 09:00 AM EDT (or EST by date) and booking stores UTC.
- Given two students try to book the same slot, then exactly one succeeds; the other sees "Slot just taken" with alternatives.
- Given a priced session, when payment fails, then the booking is not confirmed, the slot hold expires after 10 min, and no mentor notification is sent.
- Given the mentor publishes feedback with next action "Rewrite by Friday", when I tap Add next steps to Planner, then a task with that due date is created and linked to the answer.
- Given mentor no-show, then student is fully refunded automatically and the mentor's no-show count increments.

## 14. Task breakdown hint
1. Mentor profile/application/admin approval (L)
2. Availability + session types + slot engine + holds (L)
3. Directory/profile UI + filters (M)
4. Booking flow + states + notifications + ICS (L; free path first, payment via 17)
5. Preparation + attachments + consent (M)
6. Live room: LiveKit integration, device check, chat, notes, materials, screen share, reconnect (XL)
7. Feedback editor + student feedback page + planner/notes hooks (M)
8. Ratings/reviews + moderation (M)
9. Reschedule/cancel/no-show policies engine (M, with 17)
10. Mentor workspace/outcomes/earnings views (M)

## 15. Open questions
O2, O3; minimum mentor qualifications; commission model; recordings; group/mock-interview panels (non-goal v1); students under 18; legal entity for payouts; mentor tax documents (PAN/GST); who resolves disputes.
