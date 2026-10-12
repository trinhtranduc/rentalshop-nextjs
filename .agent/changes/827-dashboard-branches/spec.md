# Spec #827

## API (chỉ thêm)
- `outletIds=1,3` (tùy chọn) trên `GET /api/analytics/period`, `/overview`, `/top-products`, `/top-customers`, `/income/orders`
  (`/outlet-operations` đã có). MERCHANT: mọi id phải thuộc shop, sai → 403 `CROSS_MERCHANT_ACCESS_DENIED`; sai định dạng → 400 `INVALID_QUERY`.
  Không gửi = như cũ (mọi chi nhánh của shop). OUTLET_* bỏ qua tham số (khóa chi nhánh mình); ADMIN bỏ qua.
  Logic chung: `narrowAnalyticsOutletFilter` (`packages/utils/src/analytics/period-report.ts`).
- So sánh: `byOutlet=1` trên `/api/analytics/period` thêm `byOutlet: [{ outletId, outletName, orderValue, collected, cashCollected,
  outstanding, newOrders, collateralHeldOrders }]`, một dòng mỗi chi nhánh trong phạm vi. Tính bằng chính các hàm của tổng
  (`summarizeOrderValue`, `computeIncomePeriodSummary` theo từng chi nhánh, đếm RENT PICKUPED như `cash.depositsHeld`),
  nên tổng các dòng = `revenue.totalOrderValue / collected / cashCollected / outstanding` và = `orderValueByType` (số đơn).
  Chọn `byOutlet` thay vì `/income?outletIds` vì `/income` chia theo ngày, không có giá trị đơn mới / còn phải thu / thế chân.
- Không đổi trường cũ nào; golden tests `tests/api-compat` giữ xanh.

## Web (apps/client/app/dashboard)
- Nút Thời gian (dropdown) thay 4 tab; thêm "Tháng trước" (tháng dương lịch trước theo ngày Việt Nam). Tuỳ chọn giữ DateRangeField.
- Nút Chi nhánh chỉ cho MERCHANT khi `GET /api/outlets?isActive=all` có ≥ 2 chi nhánh. Ô tick: Tất cả, chi nhánh đang hoạt động
  (mặc định có nhãn "mặc định", chấm màu `ar-chart-*`), nhóm "Đã tắt". Điện thoại: bảng từ dưới lên, nút "Xem N chi nhánh", dòng ≥ 44px.
- Khi có bộ chọn, web luôn gửi id đã chọn (kể cả "Tất cả" = id đang hoạt động) cho period, outlet-operations và trang related.
- So sánh: bảng (desktop) / thẻ có % giá trị đơn mới (điện thoại), sắp xếp theo cột, dòng Tổng; bấm dòng = chỉ chọn chi nhánh đó.
- Lưu: URL `?outlets=` thắng localStorage (`anyrent.dashboard.outlets.<merchantId>`, try/catch). Sidebar đọc nhãn qua localStorage + sự kiện
  `anyrent:outlet-selection`: "Tất cả chi nhánh (N)", tên chi nhánh, hoặc "N chi nhánh".
- Chuỗi mới ở `locales/{vi,en,ja,ko,zh}/dashboard.json`.

## Test
- `tests/packages/utils/period-by-outlet.test.ts`, `tests/api/analytics-outlet-ids.test.ts`, `tests/web-overview-branches.test.ts`;
  chạy TZ=UTC và TZ=Asia/Ho_Chi_Minh.
