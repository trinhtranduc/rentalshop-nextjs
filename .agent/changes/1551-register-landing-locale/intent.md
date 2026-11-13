# Trang đăng ký mở theo ngôn ngữ khách đã chọn ở landing

Issue: #1551 · Author: agent · Status: in-progress · Created: 2026-11-13

## Problem

`/register` chỉ đọc `NEXT_LOCALE` (ngôn ngữ trang quản lý), không đọc `NEXT_PUBLIC_LOCALE` (ngôn ngữ landing). Khách mới đến
từ landing English / 日本語 / … luôn thấy trang đăng ký tiếng Việt (đã thử trên production 13/11). Từ #1545 ngôn ngữ shop lấy
theo ngôn ngữ trang đăng ký, nên khách nước ngoài không bấm đổi ngôn ngữ sẽ có shop, email và dữ liệu mẫu tiếng Việt.

## Proposed outcome

Trên `/register`, `/register/step-1`, `/register/step-2`, khi chưa có `NEXT_LOCALE` mà có `NEXT_PUBLIC_LOCALE`:
trang mở bằng `vi` nếu landing là `vi`, bằng `en` cho mọi ngôn ngữ landing khác, và `NEXT_LOCALE` được lưu (1 năm) để các
trang sau đăng ký dùng cùng ngôn ngữ.

## Affected users and systems

Khách mới đăng ký trên web (`client`). Không đụng API, app, trang đăng nhập.

## Constraints

- Ai đã có `NEXT_LOCALE` (tự chọn trên trang quản lý) giữ nguyên. Không có cookie landing: tiếng Việt như cũ.
- Trang quản lý vẫn chỉ VI / EN.

## Decision log

- 2026-11-13 Chủ sản phẩm: "có, sửa phần trang đăng ký theo ngôn ngữ landing". Chưa mở thêm ngôn ngữ cho trang quản lý.
