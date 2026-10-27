# 17 — Mentor session payments, free sessions, platform fee and payouts

**Status:** draft — **entirely `[PROPOSED]`** (Figma has no payment/earnings screens; owner decision D9: "an option to pay as well as the mentor can offer free session"). Fee %, refund rules and payout cadence are open (O2).
**Depends on:** 01, 02, 03 (shares Razorpay account), 16 | **Used by:** 16, 18

## 1. Purpose
Handle money for mentorship safely and transparently: collect session fees (or skip for free sessions), hold funds until the session outcome is known, split between mentor and platform, issue invoices/receipts, process refunds for cancellations/no-shows, and pay mentors out on a schedule with statements. (Student subscriptions are in 03.)

## 2. Actors
Student (payer), Mentor (earner), Admin/finance (reconciliation, refunds, disputes, payout approvals), Razorpay (payment gateway + marketplace/Route), System (ledger, scheduler).

## 3. User stories
- US-17-01 As a student I pay for a priced session with UPI/card/netbanking, see the total (price, discounts, taxes), get a receipt, and see refund status if I cancel.
- US-17-02 As a mentor I set a price or mark sessions free, see platform fee, see earnings (pending/available/paid), and download payout statements and tax documents.
- US-17-03 As finance I reconcile every rupee: payments, fees, refunds, payouts, adjustments, with an immutable ledger.
- US-17-04 As an admin I can refund, adjust, hold a payout, and resolve disputes with audit trail.

## 4. Screens and states `[PROPOSED]`
- Student: price block on mentor profile/session type; **Review & confirm booking** with price breakdown, coupon field, T&C/cancellation policy, "Pay ₹X" (Razorpay Checkout modal), payment pending/failed/success states, receipt page/email, refund status in **Session History**.
- Mentor: **Earnings** tab in Mentor workspace (summary cards: Pending (held until session complete + review window), Available, Paid out; transaction list; payout history; bank/UPI details; KYC status; tax docs), **Pricing** editor (in 16).
- Admin: payments, refunds, payouts, disputes, ledger explorer, KYC queue (see 18).
- Existing Figma anchors: `114:5586` Review and confirm booking (add price section), `132:13582` Cancel Ananya Sharma / `132:13582`-style "cancelled" screens (refund copy), `112:5901` Session History, `130:11044` Mentor workspace.

## 5. Functional requirements
**Pricing and fees**
- FR-17-01 Mentor sets price per session type in INR (integer paise), `0` = free. Platform fee = configurable % of paid amount (`platform_fee_bps`, default **TBD by owner**, A4/O2) plus gateway fees borne by `platform | mentor | student` (setting; default: platform bears gateway fee; student pays displayed price inclusive of tax).
- FR-17-02 Taxes: prices shown **inclusive of GST** where applicable (platform fee subject to GST; mentor income handled per their registration); invoice split: mentor's service invoice (as agent) + platform fee invoice `[PROPOSED; needs finance/legal review]`.
- FR-17-03 Free sessions: no payment step; booking confirms immediately; abuse controls: max N free bookings/student/week, no-show penalties apply to future free bookings (e.g. 2 no-shows → require deposit `[PROPOSED]`).
- FR-17-04 Coupons/credits: platform-funded discount codes; mentor-funded optional; discount never reduces mentor payout unless mentor-funded.

**Collect**
- FR-17-10 Flow: create booking `pending_payment` -> create Razorpay Order (amount, notes: booking id) -> Checkout -> signature verification + webhook `payment.captured` (idempotent) -> mark booking `confirmed`. Slot hold 10 min (16); late capture after expiry triggers auto-refund.
- FR-17-11 Methods: UPI, cards, netbanking, wallets (as supported by Razorpay); INR only v1.
- FR-17-12 Funds are **held** (not paid to mentor) until the session is completed, and until the dispute window closes (default 48 h after session end, or earlier on student rating ≥ 3).
- FR-17-13 Failure handling: payment failed/abandoned -> booking not confirmed, hold released; webhook retries; duplicate captures detected and refunded.

**Refunds and disputes**
- FR-17-20 Policy engine (configurable, default `[PROPOSED]`): student cancels ≥ 24 h before: 100%; 12–24 h: 50%; < 12 h: 0%; mentor cancels: 100% + goodwill credit; **mentor no-show** (absent 10 min): 100% automatically; **student no-show**: 0% (mentor paid ≥ 70% `[PROPOSED]`); technical failure attributable to platform: 100% or free reschedule; partial session (< 50% delivered): admin-decided.
- FR-17-21 Refund to original instrument via Razorpay; statuses `initiated|processed|failed`; surface in student UI and notifications; refund reverses mentor's pending earning proportionally.
- FR-17-22 Disputes: student can "Report a problem" within 48 h of session end (reasons: mentor didn't join, poor quality, inappropriate conduct, technical); creates admin case; payout for that booking frozen until resolved; outcomes: full/partial refund, no action, mentor warning/suspension.
- FR-17-23 Chargebacks from gateway handled via webhook: freeze and notify; evidence pack (attendance logs, messages) exportable.

**Earnings and payouts**
- FR-17-30 **Ledger** (double-entry, immutable): accounts per mentor (`pending`, `available`, `paid_out`), platform revenue, gateway fees, tax liabilities, refunds. Every money event writes balanced entries; balances derived.
- FR-17-31 Earning lifecycle: booking completed -> `pending` until dispute window ends -> `available` -> included in next payout run -> `paid_out`.
- FR-17-32 Payout method: Razorpay Route (linked account per mentor with KYC) or manual bank transfer batches (fallback); weekly payouts on Mondays for balances ≥ ₹500 `[PROPOSED]`; mentors can request on-demand payout (min ₹1,000, fee-free once/month `[PROPOSED]`).
- FR-17-33 Mentor onboarding for money: PAN, bank/UPI VPA, address, GST if registered, TDS declarations `[PROPOSED]`; KYC state `not_started|pending|verified|rejected`; mentors cannot publish paid session types until `verified` (free types allowed earlier).
- FR-17-34 Statements: monthly PDF/CSV per mentor with sessions, fees, taxes, TDS; student receipts/invoices by email and in account.
- FR-17-35 Admin tools: manual adjustment (reason mandatory, dual approval above ₹X), payout hold/release, refund override, reconciliation report vs Razorpay settlements (daily job flags mismatches), exports for accounting.

## 6. Data model (module `payments`)
- `payments(id, booking_id null, kind[session|subscription], payer_id, amount_minor, currency, tax_minor, discount_minor, gateway, gateway_order_id, gateway_payment_id, status[created|authorized|captured|failed|refunded|partially_refunded|disputed], captured_at, idempotency_key, raw jsonb)`
- `refunds(id, payment_id, amount_minor, reason, policy_rule, status, gateway_refund_id, initiated_by, created_at)`
- `ledger_accounts(id, owner_type[mentor|platform|gateway|tax], owner_id, kind)`; `ledger_entries(id, txn_id, account_id, direction[debit|credit], amount_minor, ref_type, ref_id, created_at)` (append-only; balanced per `txn_id`)
- `earnings(id, mentor_id, booking_id, gross_minor, fee_minor, tax_minor, net_minor, status[pending|available|paid|held|reversed], available_at, payout_id null)`
- `payouts(id, mentor_id, amount_minor, method, status[scheduled|processing|paid|failed|reversed], gateway_payout_id, period_start, period_end, statement_file_id, created_at)`
- `mentor_payout_accounts(mentor_id, kyc_status, pan_last4, bank_masked, vpa_masked, gateway_account_id, tax_info_encrypted)`
- `disputes(id, booking_id, opened_by, reason, status, resolution, resolved_by, evidence jsonb)`
- `fee_schedules(id, effective_from, platform_fee_bps, gateway_fee_bearer, min_price_minor)`; `refund_policies(id, rules jsonb, effective_from)`; `coupons` (shared with 03).
- `webhook_events(id, source, event_id unique, payload, processed_at, status)`

## 7. API surface
Student: `POST /bookings/{id}/pay` (create order) · `POST /payments/verify` (signature) · `GET /me/payments` · `GET /me/payments/{id}/receipt` · `POST /bookings/{id}/report-problem`.
Mentor: `GET/PUT /mentor/payout-account` · `GET /mentor/earnings?status=` · `GET /mentor/payouts` · `GET /mentor/statements/{month}` · `POST /mentor/payouts/request`.
Webhooks: `POST /payments/webhooks/razorpay` (verify signature; idempotent by `event_id`).
Admin: `/admin/payments`, `/admin/refunds`, `/admin/payouts/run` (scheduled/manual), `/admin/payouts/{id}/hold|release`, `/admin/disputes`, `/admin/ledger?...`, `/admin/reconciliation`.

## 8. AI behaviour
None in the money path. Optional fraud heuristics (anomaly detection on bookings/refunds) are rules-based in v1.

## 9. Entitlements
`mentor.paid_sessions` (mentor-level, requires KYC), restricted accounts blocked from booking. Not tied to student subscription tiers.

## 10. Events and notifications
`payment.captured|failed`, `refund.processed`, `earning.available`, `payout.paid|failed`, `dispute.opened|resolved`; notifications to student (receipt, refund), mentor (new paid booking, earning available, payout sent), admin (failed payout, reconciliation mismatch).

## 11. Non-functional
No card data stored; PCI SAQ-A scope via hosted checkout; all money paths idempotent with unique keys; reconciliation daily with alerts; ledger append-only with DB constraints; encrypted PII (PAN, bank) with field-level encryption and strict access logging; RPO ≤ 15 min for payments tables; regulatory: RBI payment aggregator norms handled by Razorpay (confirm marketplace/escrow compliance and **legal review before launch**), TDS u/s 194O or applicable `[needs CA/legal advice]`.

## 12. Edge cases
Payment captured but booking expired; partial refunds then reschedule; refund fails (retry then manual); mentor KYC rejected after earning exists (hold); currency rounding (all integer paise; fee rounding half-up per entry); GST rate change; mentor deletes account with pending earnings (block until settled); clock/timezone around dispute-window end; webhook out-of-order (state machine ignores regressions); chargeback after payout (reverse via negative earning).

## 13. Acceptance criteria
- Given a ₹500 session with 20% platform fee and 24 h+ cancellation, when the student cancels, then ₹500 is refunded, no earning is created, and ledger entries net to zero.
- Given a completed session and no dispute, after 48 h the earning moves to `available` and appears in the next weekly payout with a statement line.
- Given the Razorpay `payment.captured` webhook is delivered twice, then one payment state transition and one ledger posting exist.
- Given mentor no-show, then refund is initiated automatically within 5 minutes of the no-show detection and the student is notified.

## 14. Task breakdown hint
1. Ledger + payments + webhook ingestion with idempotency (L)
2. Checkout for bookings (order, verify, confirm/expire) (M)
3. Refund policy engine + cancel/no-show integration (M)
4. Mentor KYC/payout account + Route linked accounts (L)
5. Earnings lifecycle + payout runs + statements (L)
6. Disputes workflow + admin tools (M)
7. Reconciliation job + reports (M)
8. Invoices/receipts/tax docs (M; needs finance input)

## 15. Open questions
O2 (fee %, refund policy, payout cadence/minimum), who bears gateway fee, tax structure (agent vs principal), TDS, GST invoicing, minimum price, mentor KYC strictness, whether students can hold platform credits/wallet.
