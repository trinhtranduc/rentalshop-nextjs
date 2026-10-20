# Spec — Shop owner picks the shop currency (VND / USD)

Issue: #1145 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `PUT /api/settings/currency` with `{currency: 'USD'|'VND'}` by role MERCHANT → 200 `CURRENCY_UPDATED_SUCCESS`, writes only `currency`.
2. Same call by ADMIN, OPS, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY → 403 `INSUFFICIENT_PERMISSIONS`, nothing written (also with a custom `merchant.manage`).
3. Missing / unknown currency → 400 `CURRENCY_REQUIRED` / `INVALID_CURRENCY` as before. `GET` unchanged, readable by every role.
4. Web: in Cài đặt → Thông tin cửa hàng, MERCHANT sees "Tiền tệ" with VND (đ) / USD ($) below the address, hint
   "Cách hiện giá trên web và trang shop. Số tiền không tự quy đổi." Other roles do not see it.
5. Web: choosing the other currency makes the card dirty; Lưu opens "Đổi tiền tệ sang USD?" with
   "Mọi giá trên web và trang shop sẽ hiện bằng USD. Số tiền giữ nguyên, không quy đổi (220.000 đ → $220,000.00)."
   Huỷ keeps the old value unsaved; "Đổi sang USD" saves (other changed fields saved too), then every price on the web shows in USD without reload.
6. iOS / Android: one formatter per app. VND output unchanged from today. USD = `$220,000.00` (en-US grouping, 2 decimals, `−$50.00` for negatives).
   Places that add "đ" today show `$…` for USD. Missing / unknown currency → VND.
7. iOS / Android: currency comes from the login payload `user.merchant.currency` and is refreshed with `GET /api/settings/currency`
   when the settings screen appears (throttled like the overlap setting).
8. iOS / Android: MERCHANT sees a "Tiền tệ" row (value VND / USD) in shop settings; picking the other one asks the same confirm,
   calls `PUT /api/settings/currency`, stores the value and redraws prices. Other roles do not see the row.
   Android matches iOS.

## Out of scope

Converting amounts; currencies other than VND / USD; admin app; legacy v1 mobile screens; thermal printer text.

## API and data

No schema change, no new response field. Permission tightened on `PUT /api/settings/currency` only.

## Acceptance

- [ ] Jest: `tests/api/settings-currency-owner.test.ts` (1–3), `tests/web-settings-currency.test.ts` (4–5 model)
- [ ] iOS / Android unit tests for the formatter in both currencies (6)
- [ ] Visible web / Simulator / emulator checks with a local API (4–8)
- [ ] Strings in en, vi, ja, ko, zh (web) and en / vi (apps)
