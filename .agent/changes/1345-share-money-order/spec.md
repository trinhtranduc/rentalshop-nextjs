# Spec — Ảnh chia sẻ đơn: thứ tự phần tiền

Issue: #1345 · Status: done · Intent: ./intent.md

## Behavior

Đơn thuê (ảnh đơn, không nháp), từ trên xuống:

1. Có giảm giá: dòng "Tạm tính" (tổng các món) rồi "Giảm giá" (− số tiền). Không giảm giá: không có hai dòng này.
2. Ô nổi bật "Tổng tiền thuê" (xanh) NGAY sau đó, trước mọi dòng cọc.
3. Đơn có kế hoạch cọc (`hasDepositPlan`, còn đợt không VOID): khối "Thu cọc theo giai đoạn", mỗi đợt không phải "rest": "N. Tên" + số tiền, dòng nhỏ "P% đơn · dd/MM · Đã thu" hoặc "P% đơn · hạn dd/MM · Chưa thu"; đợt thu một phần: "Thu một phần". Không có "Trễ", "Hôm nay", "Đến hạn". Không có "Đã thu / Còn phải thu" và không liệt kê đợt "rest".
4. Không có kế hoạch cọc, cọc > 0: một dòng "Đã cọc" + số tiền. Cọc = 0: dòng xám "Cọc" / "Chưa cọc".
5. Ô "Thu khi giao" (viền nhạt) = Tổng − Σ số tiền các đợt không VOID và không "rest" (có kế hoạch), hoặc Tổng − Cọc (không kế hoạch), không âm, làm tròn theo tiền tệ. KHÔNG cộng thế chân, KHÔNG đổi theo trạng thái đơn (RESERVED, PICKUPED, RETURNED cùng số).
6. Thế chân: dòng "Thế chân khi nhận đồ" ngay dưới Thu khi giao (khi có).
7. Đơn bán: Tạm tính, Giảm giá (nếu có), ô "Tổng cộng". Không cọc, không Thu khi giao (như nay).
8. Đơn nháp: Giảm giá (nếu có), ô "Tạm tính" (cam), "Cọc giữ đồ" hoặc "Cọc: Chưa cọc", ô Thu khi giao (= tổng − cọc), Thế chân, rồi câu cố định của nháp. Nháp bán: như nay.
9. Số tiền theo tiền tệ shop (VND `1.150.000đ`, USD `$1,150,000`), nhãn theo ngôn ngữ ảnh (vi / en).
10. Phần ngoài tiền (tên tiệm, khách, ngày, món, QR, lời cảm ơn) giữ nguyên.

## Out of scope

Ghi chú đơn (bước sau). Phiếu in nhiệt, phiếu web. Sửa "Thu khi giao" ở chi tiết đơn (đề xuất issue riêng). API.

## API and data

Không đổi API. Dùng `OrderInstallment.amount/status/collectedAt/percent/dueDateKey`, `depositAmount`, `securityDeposit`, `collateralDetails` đã có.

## Acceptance

- [ ] Mỗi dòng Behavior có test (iOS `OrderShareImageTests`, Android `OrderShareModelTest`), đỏ trước rồi xanh
- [ ] iOS và Android cùng thứ tự, nhãn, số
- [ ] Chuỗi mới: en + vi-VN (iOS), values + values-vi (Android)
- [ ] Ảnh thật chụp từ Simulator
