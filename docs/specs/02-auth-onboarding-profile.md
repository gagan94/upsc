# 02 — Public site, authentication, onboarding, profile & settings

**Status:** draft | **Last updated:** 2026-10-27
**Depends on:** 01, 03 | **Used by:** all
**Figma:** file `6iaUE9cOXWyq5SbDe5esKm`. Tags: `[FIGMA]` drawn, `[PROPOSED]` added by author.

> **Implementation note (D22, 2026-10-27):** v1 delegates authentication to **Supabase Auth** (email/password, Google, email confirmation, password reset, later MFA). The API verifies Supabase JWTs and keeps profile/roles in `identity.users` (provider-agnostic: `authProvider`, `authSubject`). Where this spec describes self-built mechanics (Argon2id hashing, own `sessions`/`auth_codes` tables, own code-verification flow, own Google OIDC exchange), the Supabase equivalent applies instead; the user-facing screens, validation rules (password ≥ 12 chars via Supabase setting), onboarding, profile and settings requirements are unchanged. Rate limiting and account-enumeration protection come from Supabase settings.

## 1. Purpose
Get a visitor from curiosity to a working, personalised workspace with minimal friction; keep accounts secure; let the student control their profile, study preferences, privacy and connected tools.

## 2. Actors and permissions
| Actor | Can | Cannot |
|---|---|---|
| Guest | View public pages, try sample lesson / question / Mains prompt (no history saved), sign up, log in | Save anything, use Ask AI beyond sample, access workspace |
| Student | Everything in their own workspace; edit profile/settings; export/delete data | See other users' private data |
| Restricted student | Read-only workspace + appeal (see 15 moderation, 18) | Post, message, book |
| Admin | Manage users (18) | Read passwords |

## 3. User stories
- US-02-01 As a visitor I can try a sample lesson, a Prelims question and a Mains prompt without an account so I can judge the product.
- US-02-02 As a visitor I can create an account with email+password or Google and verify my email.
- US-02-03 As a returning user I can log in, reset a forgotten password, and recover from an expired session without losing context.
- US-02-04 As a new student I complete a short onboarding (preparation, focus, routine, support) that seeds my plan, and I can "Save and finish later" or "Skip for now".
- US-02-05 As a student I can edit my public profile, preparation profile, study preferences, notifications, connected tools, appearance/accessibility, privacy/data and account/contact details.
- US-02-06 As a student I can export or delete my data.

## 4. Screens and states
| Area | Figma nodes (page 0:1) | States covered |
|---|---|---|
| Public site | `548:85200` Plain account entry · `548:85204` Guest preview · `548:85208` Sample lesson · `548:85212` Sample question · `548:85216` correct · `548:85220` incorrect · `548:85224` Sample Mains · `548:85228` Sample resources · `548:85232` Mentorship preview · `548:85236` Blog · `548:85240` Article workflow · `548:85244` Article reviews · `548:85248` Article offline · `548:85252` About · `548:85256` Contact; "Entry dialog" and "Public entry dialog" frames (sign-up prompts) | guest vs. logged-in nav, "Back to website" |
| Auth | `308:43044`–`308:43068`: Plain account entry, Create your account (name, email, password ≥12 chars, accept terms & privacy, Continue with Google), An account already exists, Verify your email, Check your code, Code expired, New code on its way, Log in (3 variants), Continue with Google, Google sign-in cancelled, Could not sign in with Google, Use your existing account, Reset your password, Check your email, Choose a new password (2), Reset link unavailable, Password updated, Connection interrupted, Please wait before trying again (rate limit), Your session expired, Welcome back | success, validation, throttled, expired, offline |
| Onboarding | `308:43069`–`308:43074`: 1 Preparation (target year 2027/2028/Just exploring; stage Beginner/Preparing/Revision; attempts optional incl. Prefer not to say) -> 2 Focus ("What are you focusing on?") -> 3 Routine ("Make room for your study") -> 4 Support ("Where would help be most useful?") -> Review your starting plan; "Could not save your setup" | Back, Skip for now, Save and finish later |
| First-run | `308:43075` Your preparation starts here · `308:43229` Welcome to your workspace · `308:44461` Starter revision task · `308:44615` Starter task completed · `513:83234` First study complete · `513:83065` Responsive preview (390x844 mobile-web frames exist under "Responsive / …", so the web app must be responsive) | empty-planner concept B `90:3528` |
| Settings | `153:17134` My profile · `153:17282` Preparation profile · `153:17430` Study preferences · `153:17578` Notifications · `153:17726` Connected tools · `153:17874` Appearance & accessibility · `153:18022` Privacy & data · `153:18170` Account & contact · `153:18318` Public profile preview · `158:21162` Calendar connected · `158:21404` Calendar sync error · `158:21645` Clipper verified · `160:21879` Email verification pending | success/error banners |
| Menus | `72:4618` Profile & Settings menu (My profile, Preparation profile, Study preferences, Notifications, Connected tools, Appearance & accessibility, Privacy & data, Account & contact, Log out) | |

`[PROPOSED]` screens: change password, active sessions/devices list, delete-account confirmation, data-export status, 2FA (v1.1), terms/privacy pages, 404/500/offline, maintenance.

## 5. Functional requirements
**Public site**
- FR-02-01 `[FIGMA]` Public pages (home/guest preview, blog, about, contact, mentorship preview) are server-rendered and indexable.
- FR-02-02 `[FIGMA]` Guest samples (one lesson, one Prelims question with correct/incorrect explanation, one Mains prompt with outline, sample resources) are served from admin-flagged "sample" content; guest interactions are not persisted (copy: "do not create a saved study history").
- FR-02-03 Any save/AI action in guest mode opens the entry dialog (sign up / log in) and returns the user to the same place after auth (`return_to`).
- FR-02-04 `[FIGMA]` Contact form creates a support request (see 19) for guests.

**Signup / login**
- FR-02-10 `[FIGMA]` Sign-up fields: name, email, password (min 12 chars, breached-password check), accept Terms & Privacy (versioned acceptance stored), or Continue with Google.
- FR-02-11 `[FIGMA]` Email verification by 6-digit code (10-min expiry, 5 attempts, resend with 60 s cooldown); states "Code expired", "A new code is on its way".
- FR-02-12 `[FIGMA]` If the email already exists show "An account already exists" with log-in / Google options; Google sign-in with an email that has a password account asks to "Use your existing account" and links after password confirmation.
- FR-02-13 `[FIGMA]` Login: email+password or Google; cancellations and errors have dedicated states.
- FR-02-14 `[FIGMA]` Password reset: request -> "Check your email" (always shown, no account enumeration) -> single-use link (30 min) -> new password -> "Password updated"; invalid link state.
- FR-02-15 `[FIGMA]` Rate limiting: "Please wait before trying again" (per IP + per account; exponential backoff) for login, code, reset.
- FR-02-16 `[FIGMA]` Session expiry: refresh token rotation; on hard expiry show "Your session expired" and preserve `return_to`; unsaved drafts are kept locally (notes/answers autosave).
- FR-02-17 "Welcome back" shown after login with last-visited module link.
- FR-02-18 `[PROPOSED]` Account lockout is soft (captcha challenge) not permanent; all auth events audit-logged.

**Onboarding**
- FR-02-20 `[FIGMA]` 4 steps + review. Step data: target exam year, stage, attempt number (optional), focus subjects/papers (Prelims/Mains/both, optional subjects `[PROPOSED]`), daily study hours and preferred time windows, weekly goal, support needs (e.g. current affairs, answer writing, revision, mentorship, accountability).
- FR-02-21 `[FIGMA]` "Save and finish later" persists partial progress; "Skip for now" lands in an empty-planner home (concept B) with starter tasks; user can resume from a banner/"Finish personalising my workspace".
- FR-02-22 `[FIGMA]` "Review your starting plan" calls the plan suggester (10, 14) with the answers and shows a draft plan; on accept, tasks (incl. a starter revision task) are created; on failure show "Could not save your setup" and retry without re-entry.
- FR-02-23 Onboarding answers are editable later in Preparation profile.

**Profile & settings**
- FR-02-30 `[FIGMA]` My profile: name, avatar, bio, location (optional), public-profile preview (what other users/mentors see).
- FR-02-31 `[FIGMA]` Preparation profile: target year, stage, attempts, optional subject, medium (English only now), coaching/self-study (optional).
- FR-02-32 `[FIGMA]` Study preferences: daily/weekly goal hours, study windows, timezone (default Asia/Kolkata), week start, session length defaults, reminders on/off (ties to 10).
- FR-02-33 `[FIGMA]` Notifications: per-category (study reminders, revision due, mentorship, forum replies, product) x channel (in-app, email, push later); quiet hours (see 04).
- FR-02-34 `[FIGMA]` Connected tools: Google Calendar (OAuth, sync direction, error/disconnect states), "Research clipper" (browser extension verification `Clipper verified`) `[ASSUMED: a browser clipper that saves web text into Notes; confirm — owner has not specified]`.
- FR-02-35 `[FIGMA]` Appearance & accessibility: theme (light/dark/system `[PROPOSED]`), text size, high contrast, reduced motion, dyslexia-friendly font `[PROPOSED]`.
- FR-02-36 `[FIGMA]` Privacy & data: profile visibility (public/circles/private), leaderboard opt-in/out (12), message privacy (15), AI personalisation toggle, **export my data** (async job -> email link), **delete my account** (30-day grace, then hard delete; mentors with pending payouts must settle first).
- FR-02-37 `[FIGMA]` Account & contact: change email (re-verify; "Email verification pending"), change password, linked Google account, phone (optional), active sessions with revoke `[PROPOSED]`, log out everywhere.
- FR-02-38 Terms/privacy version bumps force a re-accept screen.

## 6. Data model (module `identity`)
- `users(id, email citext unique, email_verified_at, password_hash null, status[active|restricted|deleted_pending|deleted], roles[], locale default 'en', timezone, created_at, last_login_at)`
- `auth_identities(user_id, provider[google], provider_user_id, created_at)`
- `auth_codes(user_id, purpose[verify_email|reset_password|change_email], code_hash, expires_at, attempts, consumed_at)`
- `sessions(id, user_id, refresh_token_hash, user_agent, ip, created_at, last_used_at, revoked_at)`
- `profiles(user_id pk, display_name, avatar_file_id, bio, location, visibility)`
- `preparation_profiles(user_id pk, target_year, stage, attempt_type, focus jsonb, medium default 'en', onboarding_status[not_started|in_progress|completed|skipped], onboarding_step, onboarding_answers jsonb)`
- `study_preferences(user_id pk, daily_goal_min, weekly_goal_min, windows jsonb, week_start, default_session_min, reminders_enabled)`
- `consents(user_id, doc[terms|privacy], version, accepted_at, ip)`
- `connected_accounts(user_id, provider[google_calendar|clipper], tokens_encrypted, status, last_sync_at, error)`
- `data_export_jobs(id, user_id, status, file_id, requested_at, ready_at)`

## 7. API surface (all under `/api/v1`)
`POST /auth/signup` · `POST /auth/verify-email` · `POST /auth/resend-code` · `POST /auth/login` · `POST /auth/google` (OIDC code exchange) · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/password/forgot` · `POST /auth/password/reset` · `GET/PATCH /me` · `GET/PUT /me/preparation-profile` · `GET/PUT /me/study-preferences` · `GET/PUT /me/notification-preferences` · `GET/POST/DELETE /me/connections/{provider}` · `PUT /me/privacy` · `POST /me/data-export` · `DELETE /me` · `POST /me/email-change` · `GET /public/samples/{type}` · `POST /public/contact`. Onboarding: `GET/PUT /me/onboarding` (step answers), `POST /me/onboarding/plan-preview`, `POST /me/onboarding/complete`.
Errors: `validation_failed`, `rate_limited` (with `retry_after`), `code_expired`, `account_exists`, `identity_conflict`.

## 8. AI behaviour
Only the starting-plan suggestion (see 10 §8 `plan_suggest`): input = onboarding answers + syllabus coverage defaults; output = week-1 tasks (≤ 15) mapped to syllabus nodes and durations that fit the stated hours; must not exceed stated weekly hours; deterministic fallback template if AI fails.

## 9. Entitlements
None for auth/profile. `plan.preview` (onboarding AI plan) uses a small free quota regardless of plan.

## 10. Events, notifications, analytics
Emits `user.registered`, `user.email_verified`, `onboarding.completed|skipped`, `user.deleted`. Sends: verification code, password reset, "new login" notice `[PROPOSED]`, export ready. Analytics funnel: visit -> sample used -> signup -> verified -> onboarding done -> first study task done (the "First study complete" frame).

## 11. Non-functional
Argon2id; constant-time compares; no account enumeration; CSRF tokens for cookie auth; tokens hashed at rest; avatar upload scanned and resized; GDPR/DPDP data export < 24 h; all auth endpoints rate-limited; accessibility of forms (labels, errors announced).

## 12. Edge cases
Double signup race on same email; Google email unverified; user changes email while a code is outstanding; clock skew on code expiry; offline during onboarding (queue answers locally); deleting an account with active mentor bookings or pending payouts (block until resolved); Calendar token revoked externally -> "Calendar sync error"; trying to reuse a consumed reset link.

## 13. Acceptance criteria (samples)
- Given a new email, when I submit valid sign-up data and the correct code within 10 minutes, then my email is verified, I'm logged in and I land on onboarding step 1.
- Given I entered the wrong code 5 times, then further attempts are blocked until I request a new code and "Please wait before trying again" is shown.
- Given I click "Save and finish later" on step 3, when I log in next time, then the banner offers to resume at step 3 with earlier answers intact.
- Given I request a data export, then within 24 h I receive an email with a link valid 7 days containing my notes, answers, plans and progress as JSON + attachments.

## 14. Task breakdown hint
1. Identity module: users, sessions, JWT/refresh, email+password, verification codes (M)
2. Google OIDC + account linking (S)
3. Rate limiting + audit log (S)
4. Public pages + guest sample endpoints + entry dialog (M)
5. Onboarding wizard (4 steps + review) + plan-preview integration (M, needs 10/14)
6. Settings pages (profile, preparation, study prefs, notifications, privacy, account) (L)
7. Connected tools: Google Calendar OAuth (M, with 10)
8. Data export + account deletion jobs (M)

## 15. Open questions
O6 (brand/domain), 2FA timing, "Research clipper" scope (confirm what the Figma "Clipper" is), social login beyond Google.
