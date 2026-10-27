# Cài đặt gọn lại (app + web)

Issue: #1259 · Author: Trinh Tran · Status: approved (chủ chốt mockup "chốt mockup cài đặt, làm code đi") · Created: 2026-10-27

## Problem
App có 16 dòng + 1 công tắc ở 4 nhóm; web chủ shop có 9 tab. Mục cùng loại nằm rải rác; "Xoá tài khoản" sát "Đổi mật khẩu".

## Proposed outcome
Đúng mockup (artifact 9b56KwErJWiGpiyFEfyEY4, tab "Cài đặt app + web gọn lại", bản 171): app 12 dòng / 3 nhóm, web chủ shop 7 tab, nhân viên 4 tab, cùng tên mục. Không bỏ chức năng, quyền theo vai trò giữ nguyên. Kiểm được bằng test nhóm dòng/tab theo vai trò và link `?settings=` cũ.

## Affected users and systems
Mọi vai trò; apps: client (web), iOS, Android. Không đổi API/DB.

## Constraints
- API không đổi; app cũ không ảnh hưởng.
- Mục chỉ có trên web (Nhận đặt online, Với app cũ, Trang shop công khai) không đưa vào app.
- iOS là chuẩn, Android theo.
- Chuỗi i18n đủ en/vi (app), en/vi/ja/ko/zh (web).

## Open questions
- Bốn câu "Cần chốt" của mockup: chủ không trả lời riêng, dùng khuyến nghị (xem spec.md).

## Decision log
- 2026-10-27 — Chốt mockup, làm code (chủ shop)
