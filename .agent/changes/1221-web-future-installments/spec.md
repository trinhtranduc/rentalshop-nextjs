# Spec — Web cọc theo giai đoạn sắp thu

Issue: #1221 · Status: in-progress · Intent: ./intent.md

## Behavior
1. `futureInstallmentsTotal(series)` = tổng `amount` và tổng `count` của mọi `futureInstallments` trong chuỗi; trường thiếu/không phải số = 0; không có = `{amount:0,count:0}`.
2. Dòng hiện dưới biểu đồ khi `count > 0` (biểu đồ đã tải, không lỗi); `count == 0` thì ẩn (shop không có kế hoạch cọc).
3. Chữ: vi "Cọc theo giai đoạn sắp thu: {amount} ({count} khoản)"; en "Staged deposits coming up: {amount} ({count})", đặt trong `dashboard.json` en + vi (file chỉ có hai ngôn ngữ).
4. Số tiền qua `money` của trang (cùng định dạng các số khác).

## Out of scope
Biểu đồ mới, thay đổi API/`futureIncome`, mobile.

## API and data
Không đổi API. Kiểu optional `futureInstallments` thêm vào `SeriesPointLike` của web (kiểu `FutureInstallmentGroup` đã có sẵn ở `packages/utils`). `locales/{ja,ko,zh}/dashboard.json` không tồn tại: dashboard.json chỉ có en + vi, các ngôn ngữ khác dùng en (như mọi chuỗi dashboard hiện có).

## Acceptance
- [ ] Test `web-overview-model` cho (1)
- [ ] Test chuỗi i18n 5 ngôn ngữ + `locales-valid-json`
- [ ] Kiểm bằng mắt trên web (2)(3)
