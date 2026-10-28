# Spec #1241
1. Dòng giỏ hàng: chip tồn kho (`Còn N`, `Chỉ còn N`, `Hết đồ/Hết hàng`) và thẻ trùng lịch ở góc phải cạnh tên; nền chip rộng đúng bằng nội dung (hug content). Nguyên nhân thật (có ảnh `shots/before-*.png`): `UIControl` không có `intrinsicContentSize`, nên UIStackView đổ phần rộng dư vào chip khi tên ngắn và nền chip kéo dài tới mép phải. Sửa: `PillControl.intrinsicContentSize` + tên có hugging thấp nhất.
2. Bấm chip tồn kho mở "Lịch trống" (ProductCalendar) của sản phẩm, không focus ngày. Thẻ trùng lịch giữ hành vi cũ.
3. Vùng bấm >= 44pt (iOS) / 48dp (Android, Compose tự mở rộng vùng chạm của clickable nhỏ, không làm dòng cao thêm).
Ngoài phạm vi: web (chip chỉ là chữ), API, chuỗi.
