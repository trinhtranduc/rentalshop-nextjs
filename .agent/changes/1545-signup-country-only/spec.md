# Spec — đăng ký chỉ hỏi Quốc gia

Status: in-review

1. Web, bước 2 (cửa hàng): ô Quốc gia `[data-signup-country]` giữ nguyên (mặc định Việt Nam, 249 nước, Việt Nam đầu).
   Không còn `[data-signup-language]`, `[data-signup-currency]` và dòng `register.languageCurrencyHint`.
2. Dưới ô Quốc gia: `[data-signup-country-hint]` = `register.countryHint` với `{currency}` theo nước đang chọn.
   Trang tiếng Việt: "Tiền tệ VND · Email tiếng Việt · đổi được trong Cài đặt."; chọn Hoa Kỳ → "Tiền tệ USD · …".
   Trang English: "Currency USD · Emails in English · change in Settings."
3. Body đăng ký (email và Google): `language` = `vi` khi trang tiếng Việt, `en` khi trang ngôn ngữ khác;
   `currency` = `VND` khi Việt Nam, `USD` khi nước khác; `country` = tên tiếng Anh; `locale` như cũ.
   Hàm chung `signupShopPrefs(pageLocale, countryCode)` trong `@rentalshop/constants` (thay `signupDefaults`).
4. Sau đăng ký web không ghi `NEXT_LOCALE` / `user_language_preference` và không tải lại trang để đổi ngôn ngữ.
5. `ShopAuthPage` (đăng nhập, đăng ký) giữ nút đổi ngôn ngữ ở mọi bề rộng như đã có (màn rộng: góc trên phải; điện thoại: chân trang). Không đổi.
6. iOS, bước "Cửa hàng": chỉ còn hàng Quốc gia (`signupCountry`); không còn `signupLanguage`, `signupCurrency`;
   thêm nhãn `signupCountryHint` ("Tiền tệ VND · Email tiếng Việt · đổi được trong Cài đặt." / "Currency USD · Emails in English · change in Settings.").
   Request: `language` = ngôn ngữ app (vi → `vi`, khác → `en`), `currency` theo quốc gia, `timezone` = múi giờ máy.
7. Android giống iOS (testTag `signupCountry`, `signupCountryHint`; không còn `signupLanguage*`, `signupCurrency*`).
   Trạng thái lưu (quay lại bước 1, xoay máy) vẫn khôi phục được trạng thái cũ có thêm ngôn ngữ / tiền tệ.
8. API, Cài đặt (Tiền tệ, Ngôn ngữ email) không đổi.
9. Bước 2 đăng ký web không còn khối "Free Trial Includes"; bỏ 4 khoá `register.freeTrialIncludes`, `fullAccessToAllFeatures`, `mobileAppAccess`, `noCreditCardRequired`.

## Out of scope

- Đoán quốc gia theo IP.
- Đổi ngôn ngữ mặc định của trang đăng ký khi chưa có cookie (vẫn tiếng Việt).
