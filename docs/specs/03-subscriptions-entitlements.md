# 03 — Subscriptions, entitlements and quotas

**Status:** draft — almost entirely `[PROPOSED]` (Figma has no pricing/plan/billing screens; only the "Daily AI allowance reached" state `Ask AI / Daily AI allowance reached` in 14). The free-vs-paid split is **undecided (D12/O1)**, so this spec defines the *mechanism*, not the tiers.
**Depends on:** 01, 02 | **Used by:** every gated feature

## 1. Purpose
Let the owner define free/paid tiers (and change them later) as **data**, enforce them consistently across the platform, bill students, and show students clear, non-hostile upgrade and limit states.

## 2. Actors
| Actor | Can |
|---|---|
| Student | See plan, usage, upgrade/downgrade/cancel, view invoices, apply coupon |
| Admin | CRUD plans, entitlements, quotas, prices, coupons; grant/revoke manual entitlements; view subscriptions and failed payments |
| System | Check/consume entitlements, handle billing webhooks, run dunning |

## 3. User stories
- US-03-01 As a student I can see what my plan includes and how much of each quota I've used this period.
- US-03-02 As a student I can upgrade, downgrade, cancel (access continues until period end) and download invoices.
- US-03-03 As an admin I can change which features belong to which plan and the quota numbers without a deployment.
- US-03-04 As an admin I can grant a user a trial/comp plan or a one-off quota top-up with a reason (audited).
- US-03-05 As a student, when I hit a limit I understand what happened, when it resets, and my options.

## 4. Concepts
- **Feature key:** stable identifier such as `ai.ask.message`, `ai.mcq.generate`, `ai.mains.evaluate`, `ai.plan.weekly`, `practice.mock.full`, `learn.content.premium`, `notes.offline`, `progress.advanced`, `mentorship.book` (mentorship payment is separate, see 17), `forum.post`.
- **Entitlement:** `(plan, feature_key) -> {type: boolean|limit, limit, period: day|week|month|lifetime|none, overage: block|soft}`.
- **Plan:** a named bundle with price(s) and billing interval(s). Always at least a `free` plan (default for every user).
- **Usage counter:** `(user, feature_key, period_window) -> count`.
- **Override:** per-user grants/limits that win over the plan (support, promos).

## 5. Functional requirements
- FR-03-01 Exactly one active *base plan* per user at a time (default `free`); optional add-ons `[PROPOSED]` later.
- FR-03-02 Every gated action calls `entitlements.check(user, feature_key, cost=1)` and, on success, `consume` atomically. Denial returns `entitlement_required` (not on plan) or `quota_exceeded` (limit reached, with `resets_at`).
- FR-03-03 Check order: user override -> active subscription plan -> default `free` plan -> deny. Expired/past-due subscriptions fall back to `free` after a configurable grace (default 3 days).
- FR-03-04 Windows: `day` resets at 00:00 in the user's timezone; `week` per user's week start; `month` at billing-cycle anniversary for paid plans, calendar month for free. `[PROPOSED]`
- FR-03-05 Plan catalogue is public (pricing page for guests `[PROPOSED]`) and in-app (Profile -> "Plan & billing" `[PROPOSED]`, linked from Account & contact).
- FR-03-06 Billing via Razorpay Subscriptions: monthly/quarterly/annual intervals configurable per plan; INR; GST invoice; UPI AutoPay/cards; webhooks `subscription.activated|charged|halted|cancelled`, `payment.failed` processed idempotently.
- FR-03-07 Upgrade = immediate with proration `[PROPOSED]` (simplest: charge difference or start new cycle — decide at build; note in roadmap); downgrade/cancel = effective at period end.
- FR-03-08 Dunning: retry schedule (Razorpay), in-app banner + email on failure, downgrade to free after grace; **content created on paid features is never deleted** on downgrade (e.g. notes, answers remain readable; only new consumption is limited).
- FR-03-09 Coupons/trials: percentage or fixed off, duration, max redemptions, plan scope; free trial days per plan.
- FR-03-10 Usage endpoint returns all quotas used/limit/resets_at for the Plan & billing page and for contextual hints ("3 of 5 AI answers left today").
- FR-03-11 All entitlement changes (plan edits, overrides) are audit-logged with actor and reason.
- FR-03-12 Plan definitions are cached (Redis, 60 s) and versioned; changing limits does not retroactively reset counters.
- FR-03-13 `[FIGMA]`-derived UI states for limits: "Daily AI allowance reached" (Ask AI), plus equivalent states for MCQ generation, Mains evaluation, mocks, offline downloads. Shared component with: what you used, reset time, upgrade CTA, "continue without AI" path.
- FR-03-14 Restricted accounts (moderation, see 15/18) are orthogonal: restriction blocks community features regardless of plan.

## 6. Data model (module `billing`)
- `plans(id, key, name, description, status[draft|active|archived], is_default, sort, trial_days)`
- `plan_prices(id, plan_id, interval[month|quarter|year], amount_minor, currency 'INR', razorpay_plan_id)`
- `feature_catalog(key pk, name, description, type[boolean|limit], default_period)`  (seeded by code, editable labels in admin)
- `plan_entitlements(plan_id, feature_key, enabled, limit_value null, period, overage[block|soft])`
- `subscriptions(id, user_id, plan_id, price_id, status[trialing|active|past_due|cancelled|expired], current_period_start/end, cancel_at_period_end, razorpay_subscription_id, started_at)`
- `entitlement_overrides(id, user_id, feature_key, enabled, limit_value, period, expires_at, reason, granted_by)`
- `usage_counters(user_id, feature_key, window_start, window_end, count)` (primary store Redis; hourly flush)
- `invoices(id, user_id, subscription_id, number, amount, tax, status, pdf_file_id, issued_at)`
- `coupons`, `coupon_redemptions`, `billing_events(raw webhook log, idempotency key)`

## 7. API surface
`GET /plans` (public) · `GET /me/subscription` · `GET /me/usage` · `POST /me/subscription/checkout` (creates Razorpay subscription, returns checkout payload) · `POST /me/subscription/cancel` · `POST /me/subscription/resume` · `POST /me/subscription/change-plan` · `GET /me/invoices` · `POST /billing/webhooks/razorpay` (signature verified) · Admin: `GET/POST/PATCH /admin/plans`, `PUT /admin/plans/{id}/entitlements`, `POST /admin/users/{id}/overrides`, `GET /admin/subscriptions`.

## 8. AI behaviour
None directly; this module governs AI cost via quotas (periods usually `day` for chat, `month` for heavy tasks).

## 9. Seed catalogue (default to be decided by owner)
All feature keys ship **enabled with generous limits on a single `free` plan until O1 is decided**, so development isn't blocked; tier design is a data change.

## 10. Events and notifications
Emits `subscription.activated|changed|cancelled|past_due`, `quota.threshold_reached` (80%/100%). Notifications: payment success, payment failed, renewal reminder (3 days before), quota nearly used `[PROPOSED]`.

## 11. Non-functional
Check latency < 5 ms (Redis); counters must be race-safe (Lua/INCR with windows); webhooks idempotent and retried; no card data stored (Razorpay hosted checkout); PCI out of scope; invoices retained 8 years `[PROPOSED]` (tax norms; confirm with finance).

## 12. Edge cases
User changes timezone mid-day (window uses timezone at window start); webhook arrives before checkout redirect returns; double-click checkout; downgrade while a mock test is in progress (let it finish); plan archived while subscribers exist (grandfather); refunds and chargebacks (set subscription to `halted`, keep data).

## 13. Acceptance criteria
- Given plan `free` with `ai.ask.message` limit 5/day, when I send the 6th message, then I get `quota_exceeded` with `resets_at` and the UI shows the allowance state, and no AI call is made.
- Given an admin raises the limit to 10, when I retry within 60 s (cache TTL), then it succeeds.
- Given a failed renewal, when grace expires, then I'm on `free` and my existing notes/answers remain accessible.

## 14. Task breakdown hint
1. Feature catalogue + plan/entitlement tables + `check/consume` library + guard decorator (M — do early, everything depends on it)
2. Usage endpoint + shared "limit reached" UI component (S)
3. Razorpay subscription checkout + webhooks + invoices (L)
4. Admin plan editor + overrides (M, with 18)
5. Plan & billing page, pricing page (M)
6. Coupons/trials (S)

## 15. Open questions
O1 (tiers), refund/proration policy, GST/invoice details, whether annual plans exist, student discounts.
