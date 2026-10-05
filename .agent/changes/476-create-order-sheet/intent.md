# Create the order from a confirm sheet on the new cart

Issue: #476 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05 · Depends on: #473

## Problem

In the new cart (flag `newProducts`) "Tạo đơn" pushes a separate review screen and then shows a separate
"Thu tiền cọc" sheet before the order is created. Three steps for one decision.

## Proposed outcome

Owner-approved boards (2026-10-05): "CHỐT · Tạo đơn · Sheet xác nhận (ở lại giỏ hàng)" (Gio-hang-xac-nhan) and
"CHỐT · Tạo đơn · Sheet đã tạo" (Gio-hang-da-tao), sticky note "Tạo đơn bằng sheet — đã chốt".

- "Tạo đơn" keeps the user on the cart and opens a bottom sheet: "Tạo đơn thuê?" with Khách, Lịch thuê, Món,
  Tổng đơn and a light-blue "Thu cọc ngay <deposit>" block; Hủy / Tạo đơn. Sale: "Bán & thu tiền?" with the amount
  to collect.
- Created: a second sheet, green check, "Đã tạo đơn #<short code>", customer · dates, "Đã thu cọc <amount>" (sale
  "Đã thu <amount>"); "Tạo đơn mới" (empty cart, product list) / "Xem đơn" (the new order).
- Failure: the cart stays, the error shows.

## Affected users and systems

Shops creating orders from the new cart, iOS (reference) and Android. No API change.

## Constraints

- Same create request as today, same Idempotency-Key per checkout reused on retry, double-tap guard (#341).
- Same validation before the sheet (missing customer / dates / items → "Lỗi" alert).
- Editing an existing order keeps the review screen.
- The old cart and its preview are unchanged.

## Open questions

- None.

## Decision log

- 2026-10-05 — Sheet flow approved by the owner (canvas boards above).
