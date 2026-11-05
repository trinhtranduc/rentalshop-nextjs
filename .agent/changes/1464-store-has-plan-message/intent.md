# Store already has a plan: calm message; compact plan-screen links

Issue: #1464 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-11-03

## Problem

On dev, an owner bought Basic 12 months on iOS while the sandbox Apple ID already had Basic 6 months in the same
subscription group. Apple did not charge; it only moved the renewal to 1 year from the next renewal. The app polled the
server for about 60 s and then said "Chưa nhận được xác nhận.", as if the payment were lost.

The bottom of the plan screen also shows "Quản lý / huỷ gói" to shops that have nothing to manage in the store (trial,
manual, Lemon), and long legal labels.

## Proposed outcome

- After a purchase whose RevenueCat `CustomerInfo` still has `merchant_subscription` on another product, the slow state
  reads "Apple ID này đang có gói. Kỳ mới bắt đầu từ lần gia hạn tới." (Android: "Tài khoản Google Play này …"), with
  Thử lại and Khôi phục giao dịch. Otherwise it still reads "Chưa nhận được xác nhận.".
- "Quản lý / huỷ gói" shows only when `billingChannel` is this device's store. Bottom: at most "Quản lý / huỷ gói ·
  Khôi phục" (or "Khôi phục giao dịch") and "Điều khoản · Bảo mật".

## Affected users and systems

MERCHANT (owner) on the plan screen and the expired gate, iOS and Android. No API, no data.

## Constraints

Owner: "đơn giản và chuẩn" — change the message, not the flow. Staff screens unchanged. Disclosure above the button
unchanged (Apple's auto-renew terms). Installed apps unaffected (no API change).

## Open questions

- None blocking.

## Decision log

- 2026-11-03 — Signal: the entitlement's product in the purchase's `CustomerInfo` differs from the bought product (base id,
  Google ":basePlan" stripped). It is in the purchase callback on both SDKs; "same expiration as before" would need a
  second CustomerInfo read before the purchase, which `PurchasesManager` does not do. (agent)
- 2026-11-03 — Keep the 60 s confirmation wait; only the slow-state text changes (owner: message, not flow). A real
  confirmation still ends the wait early. (agent)
- 2026-11-03 — The iOS line "Huỷ trong Cài đặt → [tên bạn] → Đăng ký" is not in the code on origin/dev (no string, no
  label); nothing to remove. (agent)
- 2026-11-03 — PAST_DUE owner screen keeps its manage link (the payment line points to it); staff screens unchanged. (agent)
