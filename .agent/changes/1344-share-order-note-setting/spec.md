# Spec — Hiện ghi chú đơn trên ảnh chia sẻ (API + web)

Issue: #1344 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `PUT /api/settings/merchant` `{ shareOrderNote: true|false }` bởi MERCHANT → 200; chỉ `settings.shareOrderNote` đổi, mọi khoá khác của `settings` giữ nguyên; `data.shareOrderNote` trả boolean đã lưu.
2. Body chỉ có khoá này không cần `name` (không 400 `BUSINESS_NAME_REQUIRED`); không có cột nào khác bị ghi.
3. Vai trò khác (ADMIN, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY, kể cả có `merchant.manage` tuỳ chỉnh) → 403 `INSUFFICIENT_PERMISSIONS`, không ghi gì.
4. Giá trị không phải boolean (`"true"`, `1`, `null`, `{}`) → 400 `INVALID_INPUT`, không ghi gì.
5. Body không có khoá này không đụng `settings` (không gửi `settings` cho `db.merchants.update`).
6. Ghi `blockPricing` hoặc `payment` (deposit) sau đó vẫn giữ `shareOrderNote`; ghi `shareOrderNote` giữ `payment` và `blockPricing`.
7. `GET /api/users/profile` trả `merchant.shareOrderNote` (boolean) cho mọi vai trò có shop; thiếu khoá hoặc kiểu lạ = `false`.
8. Các trường cũ của profile và của PUT không đổi (chỉ thêm).
9. Web: thẻ "Hoá đơn" (tab "In & phiếu") có công tắc "Hiện ghi chú đơn trên ảnh chia sẻ", dưới khối QR, trên phần xem trước, badge "Cả shop".
10. Web: chỉ MERCHANT gạt được (`canChangeShareOrderNote`); gạt là lưu, toast thành công; lỗi trả công tắc về giá trị cũ + toast lỗi. Vai trò khác thấy công tắc mờ và dòng "Chỉ chủ shop bật/tắt.".
11. Web: giá trị đọc từ profile (`shareOrderNoteFlag`, thiếu = chưa biết → tải profile); tải lại trang giữ giá trị.

## Out of scope

Vẽ ảnh chia sẻ, công tắc trên iOS / Android (hai PR mobile); theo chi nhánh; thêm vào phản hồi đăng nhập.

## API and data

Không schema, không migration. Khoá mới `Merchant.settings.shareOrderNote` (boolean). Thêm `merchant.shareOrderNote` ở profile và `data.shareOrderNote` ở phản hồi PUT.

## Acceptance

- [ ] Jest `tests/api/merchant-share-order-note-setting.test.ts` (1–8), `tests/web-settings-share-note.test.ts` (10–11 mô hình)
- [ ] e2e API `SS-SHN-*` trong `tests/e2e/business/settings-sync.e2e.test.js`
- [ ] Chrome có đầu: chủ shop bật / tắt, tải lại giữ giá trị; quản lý / nhân viên thấy ô mờ (9–11)
- [ ] Chuỗi ở `locales/{en,vi,ja,ko,zh}/settings.json`; `locales-valid-json` xanh
