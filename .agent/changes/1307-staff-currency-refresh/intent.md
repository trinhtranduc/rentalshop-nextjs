# Nhân viên thấy đúng tiền tệ shop sau khi chủ đổi

Issue: #1307 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-29

## Problem

Chủ shop đổi tiền tệ sang VND, máy nhân viên vẫn hiện `$` đến khi đăng xuất / đăng nhập lại. iOS chỉ làm mới tiền tệ ở
Cài đặt và thoát sớm với mọi vai trò khác `MERCHANT` (`refreshCurrency` → `ShopCurrencyLogic.canChange`). Android chỉ làm mới khi mở Cài đặt.

## Proposed outcome

Mọi vai trò (trừ ADMIN) đọc lại `GET /api/settings/currency` khi vào Cài đặt, khi app mở lại (foreground) và khi vào Tổng quan,
tối đa 1 lần / phút. Dòng "Tiền tệ" vẫn chỉ hiện (và PUT) cho MERCHANT.

## Constraints

- Không đổi API, schema, payload. App cũ trên store giữ lỗi đến khi cập nhật (tạm: đăng xuất / đăng nhập).
- iOS là chuẩn, Android giống iOS. Không thêm UI hay cấu hình.
