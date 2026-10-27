# Spec

1. iOS: đơn vị ô Theo mỗi ngày = "đ / ngày" (khoá `products.form.unit.day`), giống ô Theo lần.
2. Tiêu đề mục = "Giá thuê" / "Rental price" (iOS `products.form.prices`, Android `v2_form_prices`).
3. iOS: dòng Theo block ngày có `accessibilityValue` = tóm tắt hoặc "Chưa cài"; UI test 7r đọc giá trị này.
Không đổi API, schema, field.
