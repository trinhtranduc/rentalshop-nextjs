# Spec — "Khách đưa lúc nhận đồ"

Issue: #1368 · Status: done · Intent: ./intent.md

## Behavior

Ví dụ: tổng 1.000.000; đợt 1 200.000 đã thu; đợt 2 300.000; rest 500.000; thế chân tiền 300.000.

1. Hàm thuần dùng chung `ShareMoneyRule.cashAtHandover(collectOnDelivery, collateralMoney, currency)` (iOS, Android): `nil` khi thế chân tiền <= 0; khác thì tổng hai số, làm tròn theo tiền tệ.
2. Ảnh chia sẻ (đơn thuê và đơn nháp), thế chân tiền > 0: sau cọc hiện (3) "Tiền thuê còn lại, thu khi giao" 500.000 (ô như "Thu khi giao" hiện nay), (4) "Thế chân, thu khi giao" 300.000 (giá trị "CCCD + 300.000đ" nếu có giấy tờ), (5) ô "Khách đưa lúc nhận đồ" 800.000. Số không đổi theo trạng thái đơn hay trạng thái đợt 2.
3. Chi tiết đơn thuê RESERVED, thế chân tiền > 0 và chưa có khoản thu PICKUP: mục THANH TOÁN hiện cùng ba dòng (3)(4)(5), thay dòng "Tiền thế chân +X" và dòng "Thu khi giao" cũ. Số (3) = `ShareMoneyRule.collectOnDelivery`; (5) = `cashAtHandover`. Không nhảy khi thu đợt 2.
4. Khi các đợt tường minh đã thu hết, (5) bằng `handOver(...).due` (số của nút "Giao đồ · thu …"). Khi còn đợt chưa thu, nút vẫn ghi `handOver(...).due` (không đổi): ghi là phát hiện.
5. Không thế chân tiền (0, hoặc chỉ giấy tờ): như hiện nay, nhãn "Thu khi giao" cũ, không dòng mới.
6. Đơn bán, đơn đã lấy/trả/huỷ ở chi tiết đơn: không đổi (không dòng 5). Có khoản thu PICKUP trước (`paidBefore > 0`): chi tiết đơn giữ cách hiện nay.
7. Chuỗi vi/en (iOS `Localizable.strings`, Android `strings.xml`): `share.collect.rentalLeft`, `share.collateral.collect`, `share.cashAtHandover`.

## Out of scope

`handOver` / `collectNow`, nút và sheet giao hàng, `EditOrderSheet`, API, web `buildPaySummary`, phiếu in nhiệt, đợt PARTIAL.
