# "Theo lần" trên sản phẩm có giá block ngày bị chặn BLOCK_PRICE_MISMATCH (#1667)

Issue: #1667 · Status: accepted · Created: 2026-11-26

## Problem
Nhân viên chọn "Theo lần" (hoặc "Theo ngày") cho một món rồi tạo đơn thì bị chặn: "Giá của món tính theo khối ngày không khớp với bảng giá" (`400 BLOCK_PRICE_MISMATCH`). Xảy ra khi sản phẩm có block ngày là lựa chọn mặc định nhưng chưa đặt giá "Theo lần" (không có lựa chọn `FIXED` có mã): giỏ gửi `FIXED` không kèm `pricingOptionId`, máy chủ (`findBlockOption`) coi dòng đó là block, tính lại theo bảng và so với giá nhân viên đã chọn.

## Outcome (verifiable)
Client có capability `block-pricing` gửi rõ `FIXED` / `DAILY` / `HOURLY` thì đơn tạo được, dòng giữ đúng loại và giá client gửi, không có snapshot block. App không có capability giữ nguyên hành vi (vẫn tính lại theo bảng).

## Constraints
- Chủ shop: "cho dù nhập hay không, nếu nhân viên chọn thì vẫn tạo được đơn".
- Chỉ đổi API (`apps/api/lib/order-block-pricing.ts`, `apps/api/app/api/orders/route.ts`); không đổi web, iOS, Android, schema.
- Quy tắc tiền: có bảng ví dụ VND trong issue và PR.

## Decision log
- 2026-11-26: bản iOS và Android trên `main-real` cũng gửi `block-pricing` (`DepositPlan.swift:21`, `DepositPlan.kt:27`), nên cũng là client có capability: dòng `FIXED` của chúng trước đây có thể bị `BLOCK_PRICE_MISMATCH` vì cùng nguyên nhân, nay được nhận.
