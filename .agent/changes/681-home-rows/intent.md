# Cleaner Home product rows

Issue: #681 · Author: Trinh Tran · Status: accepted · Created: 2026-10-08

## Problem

Customers say Home ("Chọn sản phẩm") is cluttered. Each row crowds name, code, stock, rent price,
per-day price and sale price into three tight lines, and a strong blue + repeats on every row.

## Proposed outcome

Rows read at a glance: name, the default rent price (the other one muted), then stock. The + is light
until the item is in the cart. Every control the screen has today stays.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android Home. No API, no web.

## Constraints

- Out-of-stock-today rows stay addable (#671).
- Add-product + keeps its permission check.
- iOS is the reference; Android matches. One PR for both apps.
- Reuse existing strings; no new keys.

## Open questions

- None.

## Decision log

- 2026-10-08 — Owner chose canvas "Phương án 1 — Danh sách gọn": no category chips, no "Thuê" label,
  ~8px between lines in a cell, plain + for add product, stock line reads "● Hết hôm nay" only (owner)
- 2026-10-08 — With both prices, the default option is bold first and the other follows muted (owner asked how to show both)
- 2026-10-08 — Review against canvas H1: in-cart + solid primary, stock line "Còn N hôm nay" 13 semibold; keep the 68 pt square photo, token type sizes and the two-line cart bar (owner agreed)
