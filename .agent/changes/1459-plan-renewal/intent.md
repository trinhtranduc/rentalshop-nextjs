# Gia hạn gói trên điện thoại — đợt 1 (API, iOS, Android)

Issue: #1459 · Author: agent for Trinh Tran · Status: accepted · Created: 2026-11-02

## Problem

Shops cannot renew their AnyRent plan on the phone.

- The Gói dịch vụ row is off for every role (`showsSubscriptionRenewal = false`, `SHOWS_SUBSCRIPTION_RENEWAL = false`);
  in the redesigned Settings (`newSettings`) the row does nothing.
- The current screens show raw API values ("Trial", "ACTIVE"), miss the auto-renew disclosure, the Terms and Privacy
  links and a manage link that Apple 3.1.2 and the Google Play subscriptions policy require.
- An expired shop logs in, then nearly every call answers 403 `SUBSCRIPTION_PERIOD_ENDED`; the app shows error text and
  offers no way to pay.
- The RevenueCat webhook never changes the plan of an existing subscription, has no `PRODUCT_CHANGE`, no refund handling,
  no idempotency, stores amount 0 on new rows and writes English history.

## Proposed outcome

Approved design (owner, 2026-11-02): mockup https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 tab "★ Gia hạn gói",
section "Thiết kế đơn giản · theo research" plus sections 1, 1b and 2; research
`~/Documents/AnyRent-marketing/research/reports/Màn gia hạn gói đơn giản.md`; decisions in `docs/TODO.md`
"Mở gia hạn gói trên web và mobile".

- An owner renews or upgrades in the app through Apple / Google Play (RevenueCat), Basic and Professional.
- The server decides when renewing the same plan (≤ 7 days left, trial, expired) and upgrading (any time) may be offered,
  and the apps follow that answer.
- Expired shops still log in and land on one calm screen: owner pays there, staff ask the owner.
- The webhook keeps the plan, period, amount, channel, auto-renew and billing issue in step with the store, once per event.

## Affected users and systems

- Roles: `MERCHANT` (buys), `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY` (expired screen only).
- Apps: `api`, iOS (reference), Android. Not web or admin (phase 2).
- Data: `Subscription` (new columns), new `BillingWebhookEvent`, `SubscriptionActivity`, `Payment`.
- External: RevenueCat, App Store, Google Play.

## Constraints

- Installed apps cannot be updated: additive API only, login and status keys keep their meaning.
- Store prices only from the stores; the store price covers the plan only (add-ons stay billed by the admin).
- Android builds have no RevenueCat key: the screens must say the purchase is unavailable and keep Thử lại / Đăng xuất.
- Vietnamese civil days for "còn N ngày" and "dùng đến".
- Apple: the billed amount is the most prominent price; Apple's purchase sheet unchanged; no buy offer to an auto-renewing
  subscriber. Google: manage link to the Play subscription center.

## Open questions

- None blocking. Store product creation and prices are the owner's (listed in the issue).

## Decision log

- 2026-11-02 — Design approved ("chốt"): option B (Professional sold on the phone), "Phổ biến" from `isPopular`, renew
  window ≤ 7 days / trial / expired, upgrade any time, no celebration screen, Home "Còn N ngày" line (owner).
- 2026-11-02 — Product ids: Basic keeps `anyrent_merchant_semi_annual` / `anyrent_merchant_annual`; Professional adds
  `anyrent_professional_semi_annual` / `anyrent_professional_annual`; Google Play base plans `semi-annual` / `annual`
  (agent, under the approved design; owner creates them).
- 2026-11-02 — The rule is exposed on `GET /api/subscriptions/status` (`canRenew`, `canUpgrade`, `purchasablePlanIds`);
  the plan ↔ product map on `GET /api/plans` (`storeProductIds`). Apps do no name matching (agent).
- 2026-11-02 — `PRODUCT_CHANGE`: an upgrade switches the plan at once (Apple and Play apply upgrades immediately); a
  downgrade is logged and takes effect with the next `RENEWAL` of the new product (agent).
- 2026-11-02 — A `RENEWAL` on a row without `storeProductId` (purchase recorded before this change) keeps the current
  plan, so an old in-app Basic purchase never drops a Professional shop at its next renewal (agent).
- 2026-11-02 — Refund = RevenueCat `CANCELLATION` with `cancel_reason: CUSTOMER_SUPPORT`: access ends at the event time
  (`currentPeriodEnd`), status `EXPIRED` (not `CANCELLED`, which `authenticateRequest` answers with 403
  `SUBSCRIPTION_CANCELLED` "contact support"), the matching payment row becomes `REFUNDED` (agent).
- 2026-11-02 — Found in the e2e run: an expired shop gets 403 `SUBSCRIPTION_EXPIRED` from `authenticateRequest`
  (`packages/auth/src/core.ts`), not `SUBSCRIPTION_PERIOD_ENDED`; the apps open the gate on `SUBSCRIPTION_EXPIRED`,
  `SUBSCRIPTION_PERIOD_ENDED` and `SUBSCRIPTION_CANCELLED` (agent).
- 2026-11-02 — SKTestSession aborts outside an XCTest process, so the iOS purchase e2e runs hosted in the app
  (`PlanRenewalHostedE2ETests`); the real-login gate and staff checks are XCUITests (`PlanRenewalE2ETests`) (agent).
- 2026-11-02 — A processing error answers 500 (was 200) so RevenueCat retries; the event id is released first, so the
  retry runs once (agent).
- 2026-11-02 — New Settings: the plan row opens the screen for the owner only; other roles keep today's read-only row.
  No staff purchase screen beyond the expired screen ("MERCHANT only") (agent).
- 2026-11-02 — Home line only when `canRenew` and active (≤ 7 days left, not auto-renewing), so an auto-renewing shop is
  not alarmed (agent).
- 2026-11-02 — Lemon Squeezy webhook: only records the channel, auto-renew and billing issue in this phase; its refund,
  idempotency and amount work is phase 2 (agent).
- 2026-11-03 — "Trừ tiền lỗi: vẫn dùng tới hết kỳ" (coordinator, from the owner's decision): a store BILLING_ISSUE keeps
  the subscription ACTIVE (no PAST_DUE), sets `billingIssueAt`, extends access to the store's grace period
  (`grace_period_expiration_at_ms`); RENEWAL / UNCANCELLATION / PRODUCT_CHANGE clear it; EXPIRATION ends access. The apps
  also open the gate on 403 `SUBSCRIPTION_PAST_DUE` (Lemon / Stripe): owner Quản lý / huỷ gói, staff "Nhờ chủ shop gia
  hạn."; `core.ts` PAST_DUE blocking unchanged for those channels (phase 2).
