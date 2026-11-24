# Plan — Orders Bảng | Lịch, Xuất Excel khi đã chọn

Issue: #1641 · Status: in-progress · Spec: ./spec.md

## Steps
1. `apps/client/app/orders/orders-view-model.ts`: quy tắc URL và chọn xuất (thuần, có test).
2. `ViewSwitch.tsx`, `orders/page.tsx` (công tắc, thanh chọn, chế độ cả bộ lọc), `calendar/CalendarView.tsx` (thân lịch dùng chung), `calendar/page.tsx` (chuyển hướng), `components/shell/nav.ts` (bỏ mục).
3. `locales/*/orders.json` (12): `web.view.*`, `web.select.{count,all,allChosen}`.
4. Tests: `tests/web-orders-view-model.test.ts`, cập nhật `tests/web-shell-nav.test.ts`.
5. Kiểm tra: jest hai múi giờ, `tsc -p apps/client` (mốc 149 lỗi), eslint file đã sửa, chạy web thật trong Chrome có cửa sổ (chọn đơn, xuất .xlsx, cả bộ lọc, chuyển dạng, chuyển hướng `/calendar`).

## Risks
Người đã quen mục Lịch giao trả trong menu; link `/calendar` cũ vẫn chạy.

## Rollback
Revert PR; không dữ liệu nào đổi.
