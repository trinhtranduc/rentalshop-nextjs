# Spec: toRevenueOrderData và buildEventWhere

Issue: #1199 · Status: draft

## Hành vi

- `toRevenueOrderData(row)` (`packages/utils/src/core/revenue-mapping.ts`): tiền thiếu = 0, `pickupTotalAmount` thiếu = `null`
  (không bao giờ 0, #505), ngày giữ nguyên. Cùng 14 trường như các bản chép tay.
- `buildEventWhere({ start, end }, kiểu)` trả `{ OR: [...] }`; người gọi tự thêm `deletedAt` và phạm vi cửa hàng. Ba kiểu, mỗi màn hình giữ kiểu cũ:
  `EVENT_WHERE_CIVIL` (income daily, income summary, danh sách income orders), `EVENT_WHERE_PERIOD`
  (income theo tháng, period report, growth-metrics), `EVENT_WHERE_BASIC` (system).
- Không thêm điều kiện nào, không bỏ điều kiện nào.

## Không thuộc PR này

- Điều kiện `payments.some(...)`, sự kiện `RENT_INSTALLMENT` (PR sau).
- `income/orders` các bộ lọc một trạng thái (`new` / `pickup` / `cancelled` / `return`): là ảnh chụp số lượng, không phải sự kiện tiền.
- `enhanced-dashboard` chỉ lọc `createdAt` (đã như vậy từ trước).

## Bằng chứng

`tests/api-compat/revenue-mapping-characterization.test.ts` (17 kịch bản, 7 route, ghi cả JSON trả về lẫn từng `where` gửi Prisma),
các golden `income-*`, `overview-*` có sẵn, và `tests/packages/utils/revenue-mapping.test.ts` (hình dạng `OR` cũ viết tay).
