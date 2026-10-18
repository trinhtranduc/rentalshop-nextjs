# Spec — iOS product detail chips show a count but no order rows

Issue: #1037 · Status: approved · Intent: ./intent.md

## Behavior

1. Product detail: with chip "Sắp tới N" (N > 0) selected, at least one order row ≥ 44 pt tall is shown.
2. Same for "Đang thuê" and "Đã xong".
3. Customer detail order rows use the same helper and get their content height.
4. An `OrderRowCell` made for use outside a table view has a height > 0 when laid out in a vertical stack.

## Out of scope

API, Android, the "Tất cả N" screen.

## API and data

None.

## Acceptance

`test7pProductDetailChipOrders` (UI) and the `OrderRowCell` standalone unit test pass.
