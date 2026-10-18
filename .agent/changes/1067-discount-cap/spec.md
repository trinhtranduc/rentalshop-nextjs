# Spec — #1067 discount cap

Limit = the line subtotal before the discount (`Cart.subtotalAmount` iOS, `Σ lineTotal` Android,
`computeTotals().subtotal` web) for an amount discount; 100 for a percent discount.

1. `discountExceeds(value, subtotal, percent)` is true only when `value > limit`. Equal to the limit is valid
   (total 0). `value = 0` is always valid, also with an empty cart.
2. The error text is `vi "Giảm giá không được lớn hơn tổng đơn (X)"`, `en "Discount can't be more than the
   order total (X)"`; X = the subtotal as money (`77đ`) or `100%` for a percent discount.
3. Discount sheet (iOS `NumberPickerViewController` in discount mode with a subtotal, Android
   `AppNumericPadSheet` from the cart): while the typed value exceeds the limit the error shows in red under the
   value and Confirm is disabled. Switching % / amount re-checks. Nothing is clamped.
4. Keypad fresh entry: when the sheet opens with a value other than 0, the first digit / `000` replaces it and
   `⌫` clears it to 0 (select-all). After that, keys append as before.
5. Cart: when the saved discount exceeds the current subtotal (items removed, quantity or price lowered), the
   cart shows the error in the blocking notice and disables "Tạo đơn" / "Bán & thu tiền" / "Lưu thay đổi"; a
   tap does nothing. Fixing the discount or adding items clears it. Removing every item may keep the note.
6. Web `apps/client` Tạo đơn / Sửa đơn: same rule, red text under the discount row, submit disabled.
   Keys `orders.editor.money.discountTooHigh` in `locales/{en,vi}/orders.json` (ja/ko/zh load the en orders file).

Out of scope: API validation (follow-up issue), admin `CreateOrderForm` (clamps on input), old iOS
`PreviewViewController` / Android `CartCheckoutScreen` cart flows except the shared keypad fresh entry.
