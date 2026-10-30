# Plan: bộ lọc "Ngày giao"

Issue: #1369 · Status: in-progress · Skills: timezone-dates, i18n-keys, api-compat-review (no API change), verify-change

1. Test đỏ `tests/web-orders-pickup-filter.test.ts` (mô hình thuần) + test API tại `tests/api/orders-list-pickup-filter.test.ts`; commit riêng.
2. `apps/client/app/orders/orders-model.ts`: `PICKUP_PRESETS`, `parsePickupPreset`, `pickupRange`, `parseDateFilter`, `dateFilterApiParams`, `dateFilterPatch`.
3. `packages/types` (`OrderFilters.dateField?`) và `packages/utils/src/api/orders.ts` (`searchOrders` gửi `dateField`): thêm tùy chọn.
4. `apps/client/app/orders/page.tsx`: ô "Ngày giao:" + ô chọn từ-đến; bộ đếm chip, danh sách, xuất Excel dùng chung tham số.
5. `locales/{en,vi,ja,ko,zh}/orders.json` (`web.pickup.*`).
6. Verify: jest hai múi giờ, `locales-valid-json`, tsc client trước/sau, eslint, xem trực quan bằng Chrome có đầu.
7. PR vào `dev`, body tiếng Việt, `Fixes #1369`, bảng API compatibility (không đổi route).
