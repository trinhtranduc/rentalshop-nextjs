# Spec — Cọc lớn hơn tiền thuê

Issue: #1490 · Status: accepted · Intent: ./intent.md

## Behavior

Ký hiệu: T = `totalAmount`, D = `depositAmount`, C = `securityDeposit`, F = `lateFee + damageFee`,
P = tổng payment `PICKUP` COMPLETED, R = tổng payment `RETURN_ADJUSTMENT` COMPLETED. Chỉ đơn RENT.

1. **Giao đồ** (`RESERVED`): `amountDue = max(0, max(0, T − D) + C − P)`; `refundDue = 0`.
2. **Trả đồ** (`PICKUPED`): `net = F + gia hạn − C − R − max(0, D − (pickupTotalAmount ?? T))`;
   `amountDue = max(0, net)`, `refundDue = max(0, −net)`.
3. D ≤ T: kết quả bước 1 và 2 giống công thức hiện tại (không đổi).
4. Case 1 (cọc < đơn): T 300.000, D 100.000, C 500.000.
   Tạo đơn thu 100.000; giao thu 700.000; trả nguyên vẹn hoàn 500.000 (khách đưa ròng 300.000); trả với F 50.000 hoàn 450.000 (ròng 350.000).
5. Case 2 (cọc > đơn): T 100.000, D 300.000, C 500.000.
   Tạo đơn thu 300.000; giao thu 500.000; trả nguyên vẹn hoàn 700.000 (ròng 100.000); trả với F 50.000 hoàn 650.000 (ròng 150.000).
6. Case 2 không thế chân (C 0): giao thu 0; trả nguyên vẹn hoàn 200.000; F 50.000 hoàn 150.000; F 250.000 thu 50.000.
7. Đơn có gia hạn (`pickupTotalAmount` khác null): API trừ cọc dư vào phần gia hạn (T 500.000, pickup 100.000, D 300.000 → gia hạn 400.000 − cọc dư 200.000 = thu 200.000). Màn trả của app không tính gia hạn; giữ nguyên.
8. iOS, Android, web và API cho cùng số ở bước 1, 2, 4, 5, 6 (cùng bộ ca test). Web hiện thêm dòng "Cọc dư so với tiền thuê" ở khung Thanh toán và hộp thoại Nhận trả; iOS, Android hiện dòng đó ở sheet Nhận trả.
9. Số tiền QR lúc giao (`qr-code` route) dùng `amountDue` bước 1.
10. Đơn SALE, đơn đã hủy và đơn cọc theo đợt (`STAGED`, #1199) không đổi.

## Out of scope

- Gộp "cọc" và "thế chân" thành một khoản.
- Doanh thu theo ngày, `getOrderRevenueEvents`, báo cáo thu/hoàn.
- Chuỗi người dùng mới, schema, migration.
- Sửa màn trả đồ để tính gia hạn.

## API and data

- Không thêm, đổi tên hay đổi kiểu field. `amountDue` và `refundDue` giữ tên và kiểu; chỉ đổi giá trị cho đơn D > T.
- Không migration. Không đổi scope merchant/outlet hay auth.
- Mobile: thêm tham số `deposit` và `total` cho `returnMoney` ở cả hai app. Web: `returnMoney` tính `excessDeposit` từ đơn.
- Chuỗi mới (en, vi): iOS `Deposit above the rent`, Android `detail_excess_deposit`, web `detail.pay.excessDeposit` và `detail.dialog.rows.excessDeposit`.

## Acceptance

- [x] Mỗi dòng Behavior có test (API, iOS, Android, web, e2e API, e2e iOS)
- [x] iOS, Android và web sửa cùng PR
- [x] Chuỗi mới có trong en và vi (web chỉ có hai ngôn ngữ này)
- [ ] Đơn đã hủy, đơn SALE, đơn STAGED không đổi
- [ ] Dòng `planned` trong `.agent/api-changes/LOG.md`; bảng `## API compatibility` trong PR
