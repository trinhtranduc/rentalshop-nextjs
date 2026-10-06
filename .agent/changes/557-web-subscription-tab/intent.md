# Intent — #557 Gói dịch vụ shows plan, expiry, usage and history

Issue: #557 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-06

## Problem

The Gói dịch vụ tab of the shop web Cài đặt dialog (#539, PR #540) still renders the old shared
`SubscriptionSection` from `packages/ui` inside `.ar-legacy`: "$0.00", English "Trial", a card inside a
card, and no history. The owner: "có vẻ thiếu shop đang dùng plan nào, khi nào hết hạn, lịch sử nâng cấp
hay gia hạn".

## Proposed outcome

A shop owner opening Cài đặt → Gói dịch vụ sees, on the shell design:

- which plan the shop is on, its state (Đang dùng / Dùng thử / Sắp hết hạn / Hết hạn / Đã huỷ / Tạm dừng),
  its price per billing interval (0 → "Miễn phí");
- when it expires as a Vietnam civil day and how many days are left (from the API);
- usage against plan limits (chi nhánh, nhân viên, sản phẩm, khách hàng, đơn hàng), red when over;
- the history of what happened to the subscription (start, trial, plan changes, extensions, renewals,
  cancel / pause / resume) and its payments, newest first.

## Affected users and systems

`MERCHANT` only (the tab is hidden for other roles, unchanged). App: `client`. Reads existing endpoints
`GET /api/subscriptions/status`, `/api/subscriptions/{id}/activities`, `/api/subscriptions/{id}/payments`.

## Constraints

- No API, `packages/**`, schema, or mobile change. Installed apps are not affected.
- Vietnam civil days (`timezone-dates`); days left come from `daysRemaining`, not recomputed.
- Upgrade / extend stay off (`SUBSCRIPTION_UPGRADE_EXTEND_ENABLED = false`); Lemon Squeezy
  `?checkout=` / `?action=` return keeps working.
- Dark mode and 390px.
- Depends on PR #540.

## Open questions

- None blocking. Upgrade/extend buttons stay hidden until the owner turns them on.

## Decision log

- 2026-10-06 — Expiry line uses `currentPeriodEnd` (the date the API enforces and `daysRemaining` counts to),
  also during a trial ("Dùng thử đến …"). (Claude, following the API)
- 2026-10-06 — Payments of amount 0 are not listed (seed/trial rows "Payment for undefined subscription"
  carry no information). Expiry-reminder activities (`subscription_expiry_reminder_sent`) are not listed:
  they are emails, not changes to the plan. (Claude)
- 2026-10-06 — A plan change reads "Nâng cấp lên X" when the old plan was a trial or the new price is higher,
  "Chuyển xuống X" when lower, otherwise "Đổi sang gói X". (Claude)
