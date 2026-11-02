# Intent — Bỏ công tắc "Ẩn tên khách trên widget"

Issue: #1432 · Epic: #1372 · Author: agent · Status: in-progress · Created: 2026-11-01

## Problem

Cài đặt có công tắc "Ẩn tên khách trên widget" (#1375, #1381). Chủ shop không cần nó.

## Proposed outcome

- Cài đặt iOS và Android không còn công tắc. Dòng "Widget" và sheet hướng dẫn giữ nguyên.
- Widget luôn hiện tên khách. Không còn trạng thái "chạm để mở".
- Không còn `hideNames` trong file widget, không còn logic, khoá đọc, chuỗi chỉ phục vụ công tắc này.
- File cũ của bản dev trước (còn `hideNames`, `labels.hiddenName`) vẫn đọc được.

## Affected users and systems

iOS (app + widget extension), Android. Không đổi API, không đổi web.

## Constraints

- File widget vẫn không có token, tiền, SĐT, ảnh.
- Widget chưa lên store: `origin/main-real` và mọi tag `release-*` không có file `TodayWidget*`. Chỉ bản dev có file cũ.
- Không migration: giá trị cũ còn trong UserDefaults / SharedPreferences vô hại, chỉ là không ai đọc nữa.
- iOS là chuẩn, Android theo.

## Open questions

Không có.

## Decision log

- 2026-11-01 — "bỏ section ẩn tên khách trên widget -> không cần" (chủ shop)
- 2026-11-01 — Không tăng `v` của file: tăng thì file cũ thành "không đọc được" (agent)
- 2026-11-01 — Giữ `.privacySensitive()` trên iOS: đó là W5 (mờ khi máy khoá), không phải công tắc (agent)
- 2026-11-01 — Đơn không có tên khách: để trống, không thêm chữ thay thế. Trước đây dòng này vô tình hiện "chạm để mở" (agent)
