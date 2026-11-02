# Plan — Đổi nhãn "Phí hư hỏng" thành "Phụ phí"

Issue: #1433 · Status: in-progress · Spec: ./spec.md

## Steps

1. Sửa chuỗi `vi`, `en` của iOS, Android, web bằng script: mỗi chuỗi cũ phải khớp đúng một lần (skill `i18n-keys`, `mobile-parity`).
2. Sửa biên lai iOS và bảng nhãn mặc định `ChangeHistory.kt`.
3. Ghi chú ở ba bảng so khớp câu API rằng đây là hợp đồng với app đã cài, không đổi (skill `api-compat-review`).
4. Sửa test đang kiểm chữ hiển thị cũ. Giữ test kiểm câu API. Thêm `tests/phu-phi-wording.test.ts`.
5. Thêm một dòng vào `.agent/api-changes/LOG.md` (không đổi route).
6. Chạy lint chuỗi, Jest, test iOS, test Android, xem màn hình.

## Files

- `apps/mobile/POS ADBD/{vi-VN,en}.lproj/Localizable.strings`, `Viewcontrollers/Tabbar/PreviewViewController.swift`, `Model/OverviewDashLogic.swift` (chỉ chú thích)
- `apps/mobile-android/app/src/main/res/{values-vi,values}/strings.xml`, `domain/history/ChangeHistory.kt`, `domain/overview/OverviewRelated.kt` (chỉ chú thích)
- `locales/{vi,en}/{orders,dashboard}.json`, `apps/client/app/dashboard/overview-model.ts` (chỉ chú thích), `apps/client/app/orders/receipt/receipt-model.ts` (chú thích)
- `tests/` và test iOS, Android

## Risks

- Đổi nhầm câu API làm app đã cài hiện sai. Test `revenue-calculator`, `api-compat` và test mới khoá việc này.
- Sửa file chuỗi hỏng. Kiểm `plutil`, `xmllint`, trùng key, `locales-valid-json`.

## Rollback

Revert PR. Không có dữ liệu hay API cần hoàn tác.
