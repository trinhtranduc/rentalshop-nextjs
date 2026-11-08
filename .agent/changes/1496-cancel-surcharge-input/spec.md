# Spec — Sheet hủy đơn có ô Phụ thu rõ ràng

Issue: #1496 · Status: accepted · Intent: ./intent.md

## Behavior

1. Nhãn của khoản shop giữ lại là "Phụ thu" ("Surcharge") ở sheet/hộp thoại hủy, ở khối kết quả đơn đã hủy và trong ghi chú (iOS, Android, web).
2. Ô phụ thu có khung rõ và chữ mờ "0"; rỗng khi bằng 0.
3. Mở sheet/hộp thoại: ô phụ thu tự lấy focus với vai trò được nhập (chủ shop, quản lý); nhân viên thấy ô khóa kèm gợi ý.
4. "Hoàn cho khách" = đã trả − phụ thu, hiện như dòng chỉ đọc, không sửa được.
5. Quy tắc không đổi: phụ thu từ 0 đến tiền cọc, gửi `cancelKeptAmount` chỉ khi lớn hơn 0.

## Out of scope

API, quy tắc tiền, quyền nhập phụ thu, màn đơn cũ (`PreviewViewController`, tắt cờ `newOrderDetail`).

## API and data

Không đổi. Chuỗi: iOS `deposit.cancel.kept` / `deposit.cancel.hint`; Android `deposit_cancel_kept` / `deposit_cancel_hint`; web `installments.cancelKept` / `cancelHint` / `cancelHintStaff`. en và vi.

## Acceptance

- [x] iOS, Android, web cùng PR
- [x] Chuỗi có en và vi
- [x] UI iOS `test5oCancelWithFee` đạt, đã xem ảnh chụp
