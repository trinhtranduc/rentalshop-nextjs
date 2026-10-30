# Spec — #1307

- Quy tắc "có đọc tiền tệ không" tách khỏi quy tắc "có sửa tiền tệ không".
  - Đọc: mọi vai trò trừ ADMIN (và phải có merchant). `ShopCurrencyLogic.canRefresh(role:)` (iOS), `CurrencySetting.canRefresh(role)` (Android).
  - Sửa / hiện dòng "Tiền tệ": chỉ MERCHANT (`canChange` / `canEdit` giữ nguyên).
- Giới hạn: không đọc lại nếu lần đọc trước < 60 giây, trừ `force`. `ShopCurrencyLogic.shouldRefresh(...)` / `CurrencySetting.shouldRefresh(...)`.
- Điểm gọi: Cài đặt (bỏ chặn theo vai trò), app vào foreground, màn Tổng quan hiện ra.
- Giá trị đổi → `.shopCurrencyDidChange` (iOS, đã có) / `SessionStore.currencyFlow` (Android, đã có) vẽ lại tiền.

## API compatibility

Không đổi. Dùng lại `GET /api/settings/currency` (`withAnyAuth`).
