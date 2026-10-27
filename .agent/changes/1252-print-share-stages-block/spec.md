# Spec: hoá đơn in và chia sẻ hiện giai đoạn cọc và giá khối

Issue: #1252

1. Đơn RENT có `hasDepositPlan == true` và `installments` khác rỗng: thêm khối sau "Tổng cộng":
   - tiêu đề "Thu cọc theo giai đoạn"
   - mỗi giai đoạn: "N. Tên · tiền" và dòng nhỏ "30% đơn · thu 25/10" / "30% đơn · hạn 28/10" + trạng thái (Đã thu, Chờ thu, Hôm nay, Trễ N ngày); giai đoạn `rest`: "Phần còn lại, thu khi giao · tiền"
   - "Đã thu" và "Còn phải thu" (từ `installmentSummary`, nếu thiếu thì cộng từ các giai đoạn)
2. Không có kế hoạch (cọc 1 lần, đơn bán, app không gửi capability): bản in giống hệt trước.
3. Ảnh chia sẻ: khối giai đoạn thay dòng "Đã cọc" khi có kế hoạch; ngoài ra như cũ. Bản nháp (giỏ) không đổi.
4. Dòng giá khối trong ảnh chia sẻ: "Khối 3 ngày + 2 ngày thêm" + công thức (đã có ở bản in nhiệt và web).
5. Giai đoạn VOID không in.

## Acceptance
- Test đơn vị mỗi nền tảng: đơn 3 giai đoạn (đã thu / hôm nay / sắp tới) ra đúng các dòng; đơn không kế hoạch ra đúng như cũ.
- Ảnh trước/sau.
