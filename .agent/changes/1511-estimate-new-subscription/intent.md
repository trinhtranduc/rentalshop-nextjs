# Ước tính doanh thu gói: gói tạo tay và gia hạn sau hotfix

Issue: #1511 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-08

## Problem

Phần "Ước tính" của khối admin "Doanh thu gói dịch vụ" (#1505) còn hai chỗ lệch quy tắc "doanh thu phát sinh đúng lúc trả tiền":
1. Gói tạo tay (`POST /api/subscriptions`, nhật ký `subscription_created`) không có `Payment` và không được ước tính: cột "Mới" 0 ở mọi tháng.
2. Gia hạn từ hotfix #1486 (07/11/2026 14:37) trở đi mà không có `Payment` là gia hạn không thu tiền, nhưng ước tính vẫn cộng số trong nhật ký.

## Proposed outcome

- Thêm `subscription_created` vào ước tính (kind `NEW_SUBSCRIPTION`) khi không phải TRIAL, `amount` > 0, VND, chưa có `Payment` gần đó.
- Bỏ nhật ký gia hạn (`subscription_extended`, `MANUAL_EXTENSION`) từ mốc hotfix trở đi khỏi ước tính.

## Affected users and systems

`ADMIN`, `OPS` (admin web). iOS, Android, client không gọi route. Không migration, không ghi dữ liệu.

## Constraints

- Chỉ thêm giá trị `kind`; field cũ giữ nguyên. Ước tính không cộng vào "Tiền đã nhận".
- Nhật ký không phân biệt gói tạo tay đã thu tiền hay tặng: số này là ước tính, có thể cao hơn thực tế.
