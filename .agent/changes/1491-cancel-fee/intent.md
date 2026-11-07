# Hủy đơn chưa giao: nhập phụ thu, phụ thu tính vào doanh thu

Issue: #1491 · Author: Trinh Tran · Status: accepted · Created: 2026-11-07

## Problem

Hủy đơn thuê chưa giao (`RESERVED`) có cọc luôn hoàn toàn bộ số đã thu, và doanh thu của đơn hủy bằng 0
(`packages/utils/src/core/revenue-calculator.ts:324-352`, "Refund all collected amounts").
Shop muốn giữ một khoản phụ thu khi khách hủy (flow của chủ shop: hủy thì thu 100.000) và tính khoản đó vào doanh thu.

Cơ chế giữ tiền đã có cho đơn cọc theo đợt (#1199): body `cancelKeptAmount` / `cancelNote`, cột `Order.cancelKeptAmount` và `cancelledAt`,
sheet "Tiệm giữ lại / Hoàn cho khách" ở iOS (`DepositPlanViews.swift`) và Android (`DepositPlanViews.kt`).
API chặn đơn thường: `planCancellation` (`apps/api/lib/installments.ts:445`) tính số đã thu của đơn không có kế hoạch cọc là 0,
nên `cancelKeptAmount > 0` trả 400 `CANCEL_AMOUNTS_MISMATCH`.

## Proposed outcome

Bấm Hủy một đơn RENT `RESERVED` thì hiện sheet nhập phụ thu, từ 0 đến tiền cọc đã thu (`depositAmount`).

- Hoàn khách = cọc − phụ thu. Doanh thu của đơn hủy = phụ thu. Phụ thu 0 = như hiện tại.
- Phụ thu không vượt tiền cọc: khách không bao giờ phải trả thêm lúc hủy, nên không có khoản thu mới.
- Đơn đã giao, đơn SALE và đơn cọc theo đợt không đổi.

Số ví dụ đã được chủ shop xác nhận (2026-11-07), nằm ở `spec.md`.

## Affected users and systems

- Roles: `MERCHANT`, `OUTLET_ADMIN` nhập được phụ thu; `OUTLET_STAFF` hủy như hiện tại (không giữ tiền), giống `CANCEL_KEEP_ROLES`.
- API: `PUT /api/orders/[orderId]`, `PATCH /api/orders/[orderId]/status`, `planCancellation`, analytics (`income/daily`, `income/orders`, `period`, `overview`).
- `packages/utils` revenue calculator (sự kiện `RENT_CANCELLED`).
- iOS (`apps/mobile`), Android (`apps/mobile-android`): sheet hủy ở chi tiết đơn.
- Web (`apps/client`): chi tiết đơn `orders/[id]/page.tsx` hiện `CancelWithKeptDialog` (đã có cho đơn cọc theo đợt) cho đơn thường chưa giao; `installments-model.ts` (`cancelView`, `cancelledOutcome`).

## Constraints

- Chỉ cộng thêm; app cũ trên `main-real` không gửi `cancelKeptAmount` nên vẫn hoàn hết (`api-compat-review`).
- Dùng lại cột của #1199 (migration `20261026090000_order_deposit_plan`, ở `dev`, chưa ở `main-real`): phải lên production cùng hoặc trước PR này.
- Cùng số ở API, iOS, Android (`mobile-parity`). Test lỗi trước (`bug-fix-tdd` áp dụng cho số doanh thu).
- Không thêm payment mới cho đơn thường: doanh thu đơn thường tính từ trường đơn, không từ payment; `recomputeDepositFromPayments` không được gọi cho đơn không có kế hoạch cọc (sẽ xóa `depositAmount`).
- Cách làm đơn giản (chủ shop: "đơn giản và chuẩn").

## Open questions

- Quyền nhập phụ thu: giữ như đơn cọc theo đợt (MERCHANT, OUTLET_ADMIN; nhân viên bị chặn)? Mặc định giả định như vậy; chủ shop chưa xác nhận.
- Chuỗi người dùng: dùng lại chuỗi của sheet cọc theo đợt ("Tiệm giữ lại", "Hoàn cho khách"). Nếu cần chữ riêng cho đơn thường thì thêm khóa vào 5 locale.

## Decision log

- 2026-11-07 — Hủy hiện sheet nhập phụ thu; phụ thu tính vào doanh thu đơn hủy (Trinh Tran).
- 2026-11-07 — Phụ thu tối đa bằng tiền cọc, khách không trả thêm (Trinh Tran; đề xuất ban đầu "thu thêm" được đổi thành "tối đa bằng cọc").
- 2026-11-07 — Làm cả web (`apps/client`) trong issue này, cùng với iOS và Android (Trinh Tran).
- 2026-11-07 — Chỉ đơn chưa giao (`RESERVED`) có phụ thu; tách khỏi #1490 (đề xuất của agent, chủ shop xác nhận bảng ví dụ).
