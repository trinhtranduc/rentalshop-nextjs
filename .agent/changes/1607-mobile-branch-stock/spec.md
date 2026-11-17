# Spec — one "Tồn và hiện ở chi nhánh" box on the apps

Issue: #1607 (also #1605) · Status: accepted · Intent: ./intent.md

## Behavior (pure rules, iOS `BranchListing` in `Model/ProductsV2.swift`, Android `domain/products/BranchListing.kt`)

1. `rows(outlets, product, creatingAt)`: a new product has quantity 1 at the branch it is created at (ticked) and 0
   elsewhere (unticked). A saved product keeps each row's stock, renting and tick.
2. A row's quantity is editable (`stock` is a var); `total(rows)` is the sum.
3. `needsBranch(rows)` is true when no row is ticked.
4. `createStock(rows)` sends every row as `{outletId, stock, isListed}`.
5. `stockWrites(original, current)` returns `{outletId, stock}` only for rows whose quantity changed.
6. `changes(original, current)` returns the moved ticks with every tick (`isListed: true`) before every untick.
7. `belowRented(rows)` returns the first row whose quantity is below its units on rent (else none).

## Behavior (form, both apps)

8. With rows (owner of a shop with 2+ open branches; branch role editing a product with 2+ rows), the form shows one
   box "Tồn và hiện ở chi nhánh":
   - The header shows "Tổng N", and the tip line sits under it.
   - Each row has a tick, the name ("(chính)" for the default branch when there are several), and a caption:
     "Chi nhánh đang dùng" on create, "Đang cho thuê X · còn trống Y" on edit.
   - Each row has a stepper whose minimum is its units on rent.
   - An unticked row with units shows the reminder.
   - A branch role's tick is dimmed, with "Chỉ chủ shop bật/tắt".
9. Without rows the form keeps the single "Số lượng" stepper (one-branch shop, branch role creating).
10. On Save with no ticked row, an inline red line "Chọn ít nhất 1 chi nhánh để hiện sản phẩm" shows in the box. The
    form scrolls to it, and nothing is sent.
11. Create sends `totalStock = total(rows)` and `outletStock = createStock(rows)`. Edit sends
    `outletStock = stockWrites(...)` (nil when nothing changed), then the owner's `changes(...)` one by one.
12. iOS: after a save, Home only inserts the product when it is shown at the branch in use (else it reloads).

## Out of scope

Web (already a table). API. Moving stock between branches in one action.

## API and data

None (see intent). No LOG row: no API change.
