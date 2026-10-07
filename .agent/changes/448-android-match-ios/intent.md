# Android new-UI screens match iOS

Issue: #448 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

The Maestro pilot (#447) runs one flow (log in → rent → hand over) on both apps. On the new-UI
screens (`newProducts`, `newOrderDetail`, `newAuth`) Android differs from iOS in four places, and the
flow needs Android-only branches for each:

1. The cart pre-fills today → tomorrow; iOS starts empty ("Chọn ngày thuê") and requires dates.
2. The order review is titled "Xem trước đơn hàng" with other section labels and has no
   "Thu tiền cọc" confirm sheet; iOS shows "Tạo đơn" and confirms the deposit before creating.
3. The hand-over sheet asks "Phương thức thanh toán"; iOS does not.
4. On the new login the keyboard hides "Đăng nhập".

## Proposed outcome

Android behaves like iOS on those screens; the create-order request stays the same; the Maestro
flow can drop its Android-only branches. Old (flag-off) screens are unchanged.

## Affected users and systems

All shop roles using the Android app with the new-UI flags. Android only; no API or iOS change.

## Constraints

- Owner decision: iOS is the reference (2026-10-05).
- Work on `dev`; nothing to production.
- Do not change what the API stores compared with iOS without asking (item 3).

## Open questions

- None. Item 3 was answered by the owner (see decision log).

## Finding behind item 3

iOS hand-over sends only `PUT /api/orders/{id}` with `status: PICKUPED` (+ optional papers /
security deposit); iOS return sends the fees (when changed) and `status: RETURNED`. iOS never calls
`/api/payments/process`. Android new-UI posted a payment (`method: CASH|TRANSFER`, `kind`,
`notes: PICKUP|RETURN_ADJUSTMENT`) before both status changes.

## Decision log

- 2026-10-05 — iOS is the reference; Android changes (owner).
- 2026-10-05 — Item 3 first left unchanged and reported (agent, per the task's stop rule).
- 2026-10-05 — Owner: match iOS, no payment record on hand-over ("không cần ghi khoản thu nó tự
  tính"). Android new-UI hand-over and return drop the payment-method picker and the
  `/api/payments/process` call; they send what iOS sends. Old flag-off screens unchanged (owner).
