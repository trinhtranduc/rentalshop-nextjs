# Chữ cọc theo giai đoạn không bị cắt "…"

Issue: #1235 · Author: Trinh Tran · Status: in progress · Created: 2026-10-26

## Problem

Ở các màn thu cọc theo giai đoạn (#1199) chữ bị cắt thành "…" hoặc cụt trên máy nhỏ (iPhone SE 3, Android 360dp, web 360px), cả VI và EN. Danh sách đầy đủ từng màn nằm trong issue.

## Proposed outcome

Mọi chữ của module cọc đọc được đủ trên máy nhỏ: xuống dòng hoặc sắp lại bố cục; số tiền không bao giờ bị cắt. iOS là chuẩn, Android và web theo iOS.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_STAFF; iOS, Android, web client. Không đổi API.

## Constraints

Đơn giản, chữ ít, không thêm control, không thêm card. Chuỗi: chỉ đổi giá trị (restDetail), không đổi key.
