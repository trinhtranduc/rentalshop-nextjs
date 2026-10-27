# Spec #1266

- Màn setup block không còn nút/hộp thoại Tạo nhanh (web `BlockSetupDialog`, iOS `BlockPriceViewController`, Android `BlockPriceScreen`).
- Gỡ hàm chỉ phục vụ Tạo nhanh: web `quickTable`, iOS `BlockPricing.quickTable`, Android `PriceForm.quickTable`; gỡ chuỗi i18n `quick*` (web 5 ngôn ngữ, iOS en+vi, Android en+vi) và test của chúng.
- UI test iOS 7r nhập tay từng ô thay cho Tạo nhanh.
- Không đổi API, DB, payload; app cài sẵn không bị ảnh hưởng (chỉ là tiện ích nhập liệu phía client).
