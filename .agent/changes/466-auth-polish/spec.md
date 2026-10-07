# Spec — Polish the new auth screens (kiểu 4A)

Issue: #466 · Status: accepted · Intent: ./intent.md · Boards: DX-Dang-nhap, DX-Tao-cua-hang-1, DX-Tao-cua-hang-2,
DX-Quen-mat-khau, DX-Da-gui, DX-Gioi-thieu (https://claude.ai/artifact/DY4DRyDH8Kps9gAw9FExLx)

## Behavior

Each line applies to iOS and Android unless it names one platform.

1. Login, create store 1 and 2, forgot password, email sent and onboarding v2 show a white page with a dot grid in the
   top 420pt: dots #E2E8F0, radius 1, every 18pt, opaque down to 30% of that height, then fading to transparent.
   The page has no blobs and no looping animation.
2. Login shows a centred brand header 96pt below the safe area: `anyrent-brandmark-ribbon` (iOS) / `anyrent_logo`
   (Android) at 72pt with corner radius 20 and a soft blue shadow, then "AnyRent" in 22pt extra-bold #1E3A8A, 10pt
   below it. Next, 48pt lower, comes the centred title "Xin chào" (28/36 extra-bold) and its subtitle (16pt #475569).
3. Login has no bottom footer. "Chưa có cửa hàng? Tạo cửa hàng mới" sits centred right under the Đăng nhập button.
4. Create store, forgot password and email sent have a top bar: a round white 44pt back button with a light shadow on
   the left, and a 32pt logo plus "AnyRent" 17pt centred.
5. Onboarding v2 has a 32pt logo plus "AnyRent" top-left and the "Bỏ qua" pill top-right. The icon card is
   white with a hairline border and a neutral shadow, and it does not float. Steps, copy, dots and buttons are unchanged.
6. Every field is 52pt high, radius 12, white, with a 1pt #CBD5E1 border, a 20pt leading icon #64748B at a 14pt inset,
   and text starting at 44pt. Icons: email = mail, password = lock, store name = storefront, phone = phone,
   address = map pin, full name = person.
7. A focused field has a 1.5pt #1D4ED8 border, a 3pt #DBEAFE ring outside it, and a #1D4ED8 icon. A field with an
   error has a 1.5pt #B91C1C border, a red icon and the red message (14pt) under it. Error wins over focus.
8. The password show/hide button sits at the right edge of the field, 44pt square, vertically centred.
9. The primary button is full width, 54pt, radius 14, #1D4ED8, with a soft blue shadow. While a request runs, it
   shows a white spinner instead of its title and ignores taps.
10. Create store step 1 shows "Đã có cửa hàng? Đăng nhập" under Tiếp tục. Tapping it goes back to login.
    Step 2 shows only the Tạo cửa hàng button.
11. Forgot password shows "Nhớ ra mật khẩu? Đăng nhập" right under Gửi liên kết. Tapping it goes back to login.
    The staff note stays at the bottom.
12. Email sent shows a 64pt #EFF6FF rounded tile with a 32pt mail icon above the 28pt title. The tile does not float.
13. All titles are 28pt extra-bold with 36pt line height. The old 26pt and 30pt sizes are gone.
14. With the keyboard up, the primary button stays visible above it (#448 / #461 behaviour).
15. Validation messages, API calls, error placement (field vs alert) and navigation targets are the same as before.

## Out of scope

- Old flag-off screens, new screens, new fields, social login, copy changes to existing strings, dark mode.
- The "Gửi lại email" resend on the email-sent screen keeps its progress overlay. It is a link, not the primary
  button.

## Note on loading (iOS)

On login, forgot password and create store, iOS used to cover the screen with a progress overlay while the
request ran. It now shows the button spinner and ignores touches on the page, as the overlay did. This matches
Android, which already showed a button spinner. The calls and their callbacks are unchanged.

## API and data

None.

## Acceptance

- [x] Each behavior line has a UI check (before/after screenshots) in `plan.md`
- [x] iOS and Android both updated (mobile-parity: UI only, no API or rule change)
- [x] New strings: `authv2.haveStore` / `authv2_have_store` ("Đã có cửa hàng?" / "Already have a shop?") and
      `authv2.rememberPassword` / `authv2_remember_password` ("Nhớ ra mật khẩu?" / "Remembered your password?"), in
      en + vi on both apps. Mobile apps ship en + vi only. "Đăng nhập" reuses the existing login button key.
- [x] Not applicable: cancelled orders, Vietnam days and role limits
