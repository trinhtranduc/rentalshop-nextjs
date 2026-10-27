# Tìm sản phẩm không phân biệt dấu

Issue: #1250 · Author: Trinh Tran · Status: draft · Created: 2026-10-27

## Problem
"Họa" không tìm ra sản phẩm tên "Hoạ tiết" (và ngược lại). Luật hiện tại: từ khoá có dấu thì so khớp đúng dấu.

## Proposed outcome
Gõ "Họa", "Hoạ", "hoa", "HOA", NFD hay NFC đều ra cùng sản phẩm trong `GET /api/products?q=`.

## Affected users and systems
Mọi vai trò tìm sản phẩm; API, web client, iOS, Android (cùng gọi `q=`).

## Constraints
App cũ không cập nhật được: không đổi response, phân trang, sắp xếp. Chỉ khớp nhiều hơn. Không đổi schema.

## Open questions
- Tìm đơn hàng/khách còn luật dấu có điều kiện (`order.ts`, `customer.ts`): ngoài phạm vi, báo riêng.

## Decision log
- 2026-10-27 — Bỏ luật dấu có điều kiện cho sản phẩm (chủ shop yêu cầu).
