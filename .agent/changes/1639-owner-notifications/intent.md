# Chủ shop nhận thông báo đơn của mọi chi nhánh

Issue: #1639 · Author: Trinh Tran (with Claude) · Status: draft · Created: 2026-11-24

## Problem
Thông báo đơn chỉ đến user có `outletId` = chi nhánh của đơn. Chủ shop (MERCHANT) chỉ có một `outletId`, nên shop nhiều chi nhánh chỉ báo cho chủ shop về một chi nhánh. Chi nhánh không có nhân viên thì không ai nhận.

## Outcome
Thông báo đơn (hộp thư + push) của mọi chi nhánh cũng đến chủ shop. Nhân viên chi nhánh vẫn chỉ nhận của chi nhánh mình. Shop từ 2 chi nhánh: nội dung có đuôi " · {tên chi nhánh}".

## Constraints
Không đổi loại thông báo, `data`, route, schema. Người nhận dùng chung cho hộp thư và push. Không migration.

## Decisions
- 2026-11-24 owner: "merchant sẽ thấy thông báo tất cả chi nhánh" (cách 1, không có lựa chọn chi nhánh).

## Open questions
Xem issue #1639: chủ shop tự thao tác có nhận thông báo của mình không; đuôi tên chi nhánh cho ai.
