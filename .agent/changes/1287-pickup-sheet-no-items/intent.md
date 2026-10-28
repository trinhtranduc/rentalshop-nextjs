# Sheet Lấy hàng bỏ list món

Issue: #1287 · Author: Trinh Tran · Status: draft · Created: 2026-10-28

## Problem
Sheet Lấy hàng liệt kê lại các món của đơn, dài và đẩy phần cần nhập xuống. Owner: "sheet pickup nên bỏ list sản phẩm đi".

## Proposed outcome
Sheet Lấy hàng (iOS + Android) không còn list món; chỉ còn phần cần nhập khi lấy hàng và nút xác nhận.

## Affected users and systems
Nhân viên/chủ shop dùng iOS và Android. Không đổi API/web.

## Constraints
Giữ nguyên logic xác nhận, API call, validation. Sheet Nhận trả giữ list món. Đơn giản, không thêm tính năng.

## Open questions
- Không.

## Decision log
- 2026-10-28 — Chỉ bỏ list ở mode handOver; Nhận trả không đổi (owner)
