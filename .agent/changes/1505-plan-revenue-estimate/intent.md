# Doanh thu gói cũ: ước tính từ nhật ký, ghi ở thời điểm thanh toán

Issue: #1505 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-08

## Problem

Khối admin "Doanh thu gói dịch vụ" (#1482) chỉ cộng các dòng `Payment` đã ghi. Gia hạn tay và nâng gói trước hotfix #1486 (7/11/2026)
không có dòng nào, nên các tháng cũ hiện 0. Script nhập bù (`scripts/backfill-manual-extension-payments.ts`) cần quyền production và
chủ shop không muốn chạy script.

## Proposed outcome

Doanh thu phát sinh **đúng lúc trả tiền** (lúc gia hạn, lúc nâng cấp), ghi vào ngày và tháng đó, không chia đều theo thời hạn gói.
`GET /api/admin/revenue/monthly` trả thêm `estimated`, tính lúc mở từ nhật ký (`SubscriptionActivity`) và các dòng thanh toán chờ; không ghi
dữ liệu. Khối admin hiện dòng riêng "Ước tính", không cộng vào "Tiền đã nhận".

## Affected users and systems

`ADMIN`, `OPS` (admin web). iOS, Android, client không gọi route này. Không migration.

## Constraints

- Chỉ thêm field mới (`estimated`); field cũ giữ nguyên.
- Chỉ VND vào tổng ước tính. Giá lấy theo giá gói hiện tại khi nhật ký không lưu số tiền (ước tính, không phải số thật).
- Lần nào đã có dòng thanh toán thật thì dùng số thật, không cộng ước tính (không đếm hai lần).
