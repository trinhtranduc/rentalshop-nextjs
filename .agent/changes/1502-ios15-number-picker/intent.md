# Hộp thoại nhập số không bị cắt trên iOS 15 (iPad cũ)

Issue: #1502 · Author: Trinh Tran · Status: accepted · Created: 2026-11-08

## Problem

Chủ shop báo: ở hộp thoại nhập giảm giá trên iPad, nút `%` và `$` không bấm được vì bị nút dưới che; bản iOS mới chạy được. App hỗ trợ từ iOS 15
(`IPHONEOS_DEPLOYMENT_TARGET = 15.0`). `NumberPickerViewController.instance()` từ iOS 16 dùng chiều cao tự đo (`.custom`, ~535-557 điểm cho giảm giá);
trước iOS 16 dùng `.medium()` = nửa màn hình, ~400 điểm trên iPad nằm ngang, nhỏ hơn nội dung cần, nên cụm `%` / số tiền bị nút Xác nhận đè.
Chưa chạy được trên iOS 15 vì máy dev chỉ có runtime iOS 26; nguyên nhân rút ra từ code và từ việc iOS mới chạy được.

## Proposed outcome

Trên iOS 15, hộp thoại nhập số dùng `.large()` thay `.medium()`: thấy đủ giá trị, bàn phím số, cụm `%` / số tiền và nút Xác nhận. iOS 16+ không đổi.

## Constraints

Không đổi hành vi iOS 16+, API hay chuỗi.

## Open questions

- Cần chủ shop xác nhận trên iPad iOS cũ (không có máy iOS 15 ở đây để tự kiểm).

## Decision log

- 2026-11-08 — Chủ shop: "có thể iPad iOS cũ, bản mới thì chạy được" (Trinh Tran).
