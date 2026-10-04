# Spec — Mobile auth screens match the approved boards (phase 5)

Issue: #386 · Status: accepted · Intent: ./intent.md

## Behavior

1. **Flag.** The login entry is built from `newAuth`: iOS `AppDelegate.loadLogin`, Android the `login` route in
   `AnyRentNavHost`. The flag comes from the cached app-config (or a fetch that finished first). Off: old screens.
2. **Login** (`Dang-nhap`): logo + AnyRent, "Đăng nhập", subtitle, Email (prefilled with the last login email),
   Mật khẩu with a show/hide button (44pt/48dp, labelled), "Quên mật khẩu?", the Đăng nhập button, and at the bottom
   "Chưa có cửa hàng? Tạo cửa hàng mới". Tapping Đăng nhập validates inline (email required and valid, password
   required, at least 6). Wrong email/password (`INVALID_CREDENTIALS`, 401) shows inline under the password; other
   errors show in an alert. Success runs exactly the current success path.
3. **Create store, step 1** (`Dang-ky`): back, "Bước 1/2" and a half bar; Tên cửa hàng, Số điện thoại, Địa chỉ;
   "Bạn cho thuê gì? (chọn nhiều)" chips: Áo dài, Váy cưới, Trang phục, Thiết bị quay phim, Xe, Dụng cụ, Khác
   (`AO_DAI`, `WEDDING_DRESS`, `COSTUME`, `FILM_EQUIPMENT`, `VEHICLE`, `EQUIPMENT`, `OTHER`). Chip rules as today:
   `OTHER` is selected at start, at least one stays selected, picking a niche drops `OTHER`.
   Tiếp tục validates inline: name required (≥ 3), phone required and 10–13 digits or `+` (spaces ignored),
   address required (≥ 3).
4. **Create store, step 2** (`Dang-ky-2`): "Bước 2/2" and a full bar; Họ và tên, Email, Mật khẩu ("Ít nhất 6 ký tự."),
   Nhập lại mật khẩu, the terms checkbox with links to the terms and privacy pages, and Tạo cửa hàng. Inline errors:
   name required (≥ 2), email required and valid, password required (≥ 6), confirm required and equal, terms accepted.
   Back returns to step 1 with every value kept (and step 2 values kept when going forward again).
5. **Register payload** is today's: `firstName` (first word), `lastName` (rest), `email`, `password`, `phone`,
   `role: MERCHANT`, `businessName` and `outletName` = store name, `address`, `businessTags`, `pricingType: FIXED`.
   Text is trimmed; spaces are removed from the phone. A 409 (`EMAIL_EXISTS` / `MERCHANT_DUPLICATE`) shows inline
   under the email; other errors in an alert.
6. **After sign-up** the app does what it does today: iOS opens the "check your email" screen (now the new sent
   screen in its sign-up wording, resend = resend verification); Android returns to login.
7. **Forgot password** (`Quen-mat-khau`): back, title, text, Email, "Gửi liên kết", and the staff note at the bottom.
   Email is validated inline; the call is `POST /api/auth/forgot-password`; errors show in an alert (iOS) or inline
   (Android), as today.
8. **Email sent** (`Quen-mat-khau-da-gui`): mail icon, "Kiểm tra email", text with the email in bold, "Về đăng nhập"
   (back to the login screen), and "Gửi lại email". Resend calls the same endpoint again; after a tap the button is
   disabled for 60 s and shows the seconds left.

## Out of scope

Onboarding, the old screens, password reset inside the app, API changes, iPad-specific layouts beyond a centred
max width.

## API and data

None changed. `forgot-password` always answers success for a valid email (no account enumeration); with no mail
provider it logs the mail (`EMAIL_PROVIDER=console`). It is rate limited to 3 calls per hour per IP (429).

## Acceptance

- [ ] Unit tests (iOS and Android): validation of login, step 1, step 2, forgot; register payload from the two steps;
      error code / status → field or alert; resend cooldown.
- [ ] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [ ] Manual check on both apps against a local API with screenshots: login OK, wrong password, new store end to end,
      validation errors, forgot → sent, flag off shows the old screens.
- [ ] New strings in iOS `vi-VN`/`en` and Android `values`/`values-vi`.

## Changes after review (style E)

- Login heading "Xin chào", subtitle "Đăng nhập để vào cửa hàng của bạn.", no logo. Round 44pt back button,
  6pt progress bar with "Bước n/2" in the content, 54pt buttons, blue selected chips, floating mail icon.
- Android: a wrong password is a 401 that also expires the session; with the new login on screen the
  NavHost does not rebuild the login, so the inline message and the typed email stay. Flag off: unchanged.
- iOS: no tap-to-dismiss on the auth pages (with IQKeyboardManager it swallowed the first button tap);
  Return moves through the sign-up fields; the keyboard closes before pushing a screen.
