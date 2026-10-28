# Huỷ đơn thu cọc theo giai đoạn: kiểm từng giai đoạn và sửa lỗi

Issue: #1253 · Status: in-progress · Created: 2026-10-27

## Problem
Chủ hỏi "check thêm nếu stage enable và hủy ở từng giai đoạn thì sao?". Kiểm 10 tình huống huỷ thấy 3 lỗi (xem issue): hoàn tiền hai lần khi huỷ trùng, đơn huỷ hiện "Còn lại" sai, web thiếu số giữ/hoàn trên đơn huỷ.

## Proposed outcome
Huỷ idempotent (một lần hoàn), đơn huỷ "Còn lại" = 0, web hiện "Tiệm giữ lại / Hoàn cho khách" như app. Ma trận 10 tình huống có test.

## Affected users and systems
Chủ shop và quản lý (MERCHANT, OUTLET_ADMIN). API `recordPlanCancellation`, `installmentSummary`, web `apps/client/app/installments`. Không đổi mobile (số lấy từ API).

## Constraints
Chỉ thêm. Không đổi field đang có (chỉ giá trị `planned/remaining` của đơn huỷ, field mới của #1199, chưa lên `main-real`). Keep it simple.
