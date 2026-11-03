# Cancel after an App Store upgrade; no auto-renew card on the plan screen

Issue: #1466 · Author: agent (for Trinh Tran) · Status: in-progress · Created: 2026-11-03

## Problem

Owner's sandbox test on dev (shop 30, iPhone): Basic 12 months, then an upgrade to Professional 12 months, then
auto-renew off in Apple's manage sheet. The events were RENEWAL (`anyrent_merchant_annual`), PRODUCT_CHANGE
(`anyrent_merchant_annual` → `anyrent_professional_annual`), CANCELLATION (`anyrent_merchant_annual`).

PRODUCT_CHANGE stored `storeProductId = anyrent_professional_annual`. The CANCELLATION carried the Basic product id, so
`isCurrentProduct` in `apps/api/app/api/webhooks/revenuecat/route.ts` said "another product", the event was only logged
and `autoRenew` stayed true. The app kept showing "Tự gia hạn ngày …" after the owner cancelled. EXPIRATION, the refund
branch of CANCELLATION and SUBSCRIPTION_EXTENDED use the same check and are dropped the same way after an upgrade.

The plan screen also repeats what the store already says: a "TỰ GIA HẠN" card with the next charge date and price. The
owner decided to remove it; managing and cancelling go through "Quản lý / huỷ gói".

## Proposed outcome

- An App Store event belongs to the shop's store subscription when its `original_transaction_id` equals
  `Subscription.storeOriginalTransactionId` (Apple keeps the id across upgrades, downgrades and crossgrades inside a
  subscription group). The product decides only when either id is missing, and on Google Play.
- After RENEWAL Basic → PRODUCT_CHANGE Professional → CANCELLATION (Basic id, same original transaction id):
  `autoRenew = false`, `cancelAtPeriodEnd = true`, period unchanged. Same for EXPIRATION and a refund after an upgrade.
- iOS and Android plan screens: no auto-renew card; the CHỌN GÓI row of the current plan says "Đang dùng".

## Affected users and systems

`MERCHANT` (owner) on iOS and Android; `api` (RevenueCat webhook); RevenueCat, App Store, Google Play.

## Constraints

- No schema, response, request or env change. Installed apps (main-real) do not call the webhook and do not read
  `autoRenew`.
- Keep A8 (event order), A9 (once per event id), A10 (refund cuts only the period in use), A13 (renewal credit).
- Google Play keeps today's behaviour: RevenueCat says every Play product change starts a new order id, so
  `original_transaction_id` is not stable there across an upgrade.

## Open questions

- None blocking. RevenueCat does not document whether it sends an EXPIRATION for the upgraded-away App Store product;
  Apple expires a subscription (original transaction), not a product, and the event flow for an App Store upgrade is
  PRODUCT_CHANGE + RENEWAL. If such an event ever came while the period runs, it only turns auto-renew off (access is
  kept) and the next RENEWAL turns it back on.

## Decision log

- 2026-11-03 — Match App Store events by original transaction id; Play and events without ids keep the product rule
  (agent, per the owner's brief).
- 2026-11-03 — Not done: "accept the pre-change product right after a PRODUCT_CHANGE". It needs the old product stored
  (a column or a history read), and on Play the old product's events after a change are about the replaced purchase,
  so accepting them there would turn off the new plan's auto-renew. The original transaction id covers the App Store
  case without new state (agent).
- 2026-11-03 — Remove the "TỰ GIA HẠN" card and the "· tự gia hạn ngày …" subtitle on both apps (owner).
