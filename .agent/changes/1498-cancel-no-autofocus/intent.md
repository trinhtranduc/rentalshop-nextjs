# Sheet hủy đơn không tự focus ô Phụ thu

Issue: #1498 · Author: Trinh Tran · Status: accepted · Created: 2026-11-08

## Problem

#1496 cho ô Phụ thu tự lấy focus khi mở sheet hủy đơn. Bàn phím che phần trên của sheet (tiêu đề cuộn khỏi màn hình) và phần lớn lần hủy không cần phụ thu.

## Proposed outcome

Mở sheet/hộp thoại hủy đơn ở iOS, Android, web: không tự focus ô Phụ thu, không bật bàn phím; chạm vào ô mới nhập. Web: focus vào nút "Giữ đơn".

## Constraints

Không đổi quy tắc tiền, API, chuỗi; giữ nhãn "Phụ thu", khung nhập và "Hoàn cho khách" chỉ đọc của #1496.

## Decision log

- 2026-11-08 — Người dùng tự chủ động nhập phụ thu, không tự focus (Trinh Tran).
