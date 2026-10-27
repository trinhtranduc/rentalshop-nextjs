# Ảnh sản phẩm trong Top sản phẩm

Issue: #1243 · Author: Trinh Tran · Status: draft · Created: 2026-10-27

## Problem

Chủ: "top sản phẩm cần bổ sung thêm hình sản phẩm". Hàng Top sản phẩm ở Tổng quan chưa có ảnh trên web (chữ cái đầu), iOS và Android (thẻ Tổng quan). Android "Xem tất cả" đã có ảnh.

## Proposed outcome

Mỗi hàng Top sản phẩm (thẻ và "Xem tất cả") có thumbnail vuông bo góc nhỏ cạnh tên; không có ảnh thì dùng placeholder sẵn có. Hàng không cao thêm nhiều. Top khách hàng giữ nguyên.

## Affected users and systems

Mọi vai trò xem Tổng quan; web client, iOS, Android. Không đổi API: `topProducts[].image` đã có (cả trên main-real).

## Constraints

Đơn giản và chuẩn. Không đổi field API. iOS là chuẩn; Android khớp iOS.

## Open questions

- Không.

## Decision log

- 2026-10-27 — dùng `image` có sẵn, không thêm field API (Trinh Tran)
