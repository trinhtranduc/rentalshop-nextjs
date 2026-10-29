# Spec

- iOS: `ShopDepositLogic.canView(role:)` = `role == .merchant`. `SettingsV2Logic.sections` chỉ thêm `.deposit` khi true; `.printing` luôn có.
- Android: `DepositSetting.canView(role: String?)` = `role == "MERCHANT"`; `SettingsRows.sections` làm tương tự.
- Màn Thu cọc chỉ mở từ dòng này (không có deep link / thông báo khác), nên ẩn dòng là đủ.
- `DepositModeStore.refresh` ở Cài đặt và Giỏ giữ nguyên.
- Không chuỗi mới. App cũ trên store vẫn hiện dòng đến khi cập nhật (không đổi API).

## Test
MERCHANT thấy; OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY, ADMIN, nil không thấy; các dòng khác của vai trò đó không đổi.
