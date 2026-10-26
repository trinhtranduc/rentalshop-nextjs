# Badge "Đã thu N%" chỉ cho đơn có kế hoạch cọc

Issue: #1222 · Author: agent · Status: in-progress · Created: 2026-10-26

## Problem
Danh sách đơn hiện "Đã thu N%" cho mọi đơn RENT RESERVED khi shop STAGED, cả đơn "Thu cọc 1 lần" cũ, vì client suy % từ depositAmount/totalAmount.

## Proposed outcome
Badge chỉ hiện cho đơn có `Order.depositPlan`. Đơn một lần không badge, kể cả khi shop STAGED.

## Affected users and systems
Web, iOS, Android, `GET /api/orders` (additive, chỉ client có capability `installments`).

## Constraints
- App cũ trên main-real không đổi phản hồi.
- Không N+1: một truy vấn groupBy cho cả trang.
- Android theo iOS.

## Decision log
- 2026-10-26 — Chỉ đơn có kế hoạch cọc nhiều lần có badge. (owner)
