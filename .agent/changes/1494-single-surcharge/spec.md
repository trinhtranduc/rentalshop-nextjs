# Spec — Một ô Phụ thu ở Nhận trả

Issue: #1494 · Status: accepted · Intent: ./intent.md

## Behavior

1. Sheet/hộp thoại Nhận trả có đúng một ô tiền "Phụ thu" ("Surcharge"); không còn ô "Phí trễ" và "Phụ phí" riêng.
2. Ô điền sẵn `lateFee + damageFee` của đơn (rỗng/0 khi bằng 0).
3. Xác nhận: tổng gõ vào bằng tổng đã lưu → không gửi cập nhật phí, chỉ đổi trạng thái; khác → lưu `damageFee = tổng`, `lateFee = 0`, rồi đổi trạng thái.
4. Số thu/hoàn (`net = phụ thu − thế chân − cọc dư − đã thanh toán`) không đổi so với trước, với cùng tổng phí.
5. Dòng tổng phí trong sheet có nhãn "Phụ thu"; dòng `damageFee` ở chi tiết đơn có nhãn "Phụ thu"; dòng `lateFee` ("Phí trễ") còn cho đơn cũ.
6. Nút xác nhận: hoàn → "Give back {số tiền}" / "Trả khách {số tiền}"; thu thêm → "Collect more {số tiền}" / "Thu thêm {số tiền}"; không có gì → "Taken back" / "Đã nhận" (web: "Confirm return" / "Xác nhận nhận trả").
7. iOS, Android và web cho cùng hành vi ở 1-6.

## Out of scope

- API, schema, báo cáo, nhãn lịch sử thay đổi, in hóa đơn.
- Gộp hai dòng "Phí trễ" và "Phụ thu" ở chi tiết đơn cũ thành một.

## API and data

Không đổi route, field hay quy tắc. Đơn do app mới lưu có `lateFee = 0`, `damageFee = tổng`; app cũ cộng hai trường nên số y như nhau.
Chuỗi mới: iOS `Surcharge`, `Give back %@`, `Collect more %@`; Android `surcharge` (+ `detail_received_refund`, `detail_received_collect` đổi chữ);
web `detail.dialog.takeBack.surcharge` (+ `detail.dialog.rows.fees`, `detail.pay.damageFee`, `takeBack.confirmRefund`, `takeBack.confirmCollect` đổi chữ). en và vi.

## Acceptance

- [x] Mỗi dòng Behavior có test (iOS `OrderDetailLogicTests`, Android `HandOverReturnNoPaymentTest`, web `web-orders-actions.test.ts`)
- [x] iOS, Android và web cùng PR
- [x] Chuỗi mới có en và vi
