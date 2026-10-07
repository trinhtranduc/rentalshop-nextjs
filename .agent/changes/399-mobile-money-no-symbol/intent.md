# Mobile: new screens show money without a currency symbol

Issue: #399 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

The redesigned mobile screens (behind the `new*` flags) format every amount as "1.150.000đ".
The "đ" is hardcoded in the iOS `MoneyFormatter`, the Android `formatMoneyVnd`, the product
form unit labels and the cart discount-type chip. Shops that bill in another currency
(seed merchant 1 uses USD) see a wrong symbol on every amount.

## Proposed outcome

On the redesigned screens every amount is a plain grouped number: "1.150.000", "−50.000", "0".
No "đ", "₫", "VND" or "$" appears next to money. Unit words ("/lần", "/ngày") stay.

## Affected users and systems

All mobile roles. iOS (`apps/mobile`) and Android (`apps/mobile-android`). No API change.

## Constraints

- Old screens (flags off) must look exactly as before.
- Keep the diff small: #396 edits the same screens and token files at the same time.

## Open questions

- None.

## Decision log

- 2026-10-04 — Owner: new screens show numbers only, no currency symbol (Trinh Tran).
- 2026-10-04 — Android keeps the name `formatMoneyVnd`: `formatMoney` already exists in
  `UiHelpers.kt` (comma grouping, used by old screens), so a rename would clash.
