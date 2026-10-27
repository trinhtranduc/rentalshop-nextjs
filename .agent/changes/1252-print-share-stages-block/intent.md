# Hoá đơn in giấy và ảnh chia sẻ hiện cọc theo giai đoạn và giá khối

Issue: #1252 · Author: Trinh Tran · Status: draft · Created: 2026-10-27

## Problem
Bản in nhiệt và ảnh chia sẻ của iOS, Android và hoá đơn web chỉ có một dòng "Cọc". Đơn có kế hoạch cọc (#1199) không cho khách thấy giai đoạn nào đã thu, hạn nào, còn bao nhiêu. Ảnh chia sẻ thiếu dòng "Khối N ngày + M ngày thêm" của giá khối (#1189).

## Proposed outcome
Đơn có `hasDepositPlan` và `installments[]`: bản in và ảnh chia sẻ có khối giai đoạn (tên, %, tiền, trạng thái + hạn), "Đã thu", "Còn phải thu". Đơn cọc 1 lần: không đổi một dòng nào. Dòng khối có nhãn "Khối N ngày + M ngày thêm" và công thức.

## Affected users and systems
MERCHANT, OUTLET_ADMIN, OUTLET_STAFF in hoá đơn; khách nhận ảnh. client, iOS, Android. Không đổi API.

## Constraints
Khổ giấy hẹp: gọn. Chủ muốn đơn giản. iOS là chuẩn. Không có link công khai của đơn. Không thêm chuỗi (dùng lại `deposit.*`, `orders.web.installments.*`). App cũ không bị ảnh hưởng.

## Open questions
- Không.

## Decision log
- 2026-10-27 — dùng lại chuỗi có sẵn, không đổi API (chủ: "đơn giản và chuẩn")
