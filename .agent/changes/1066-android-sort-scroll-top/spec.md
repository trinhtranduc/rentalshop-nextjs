# Spec — Android product orders: a new sort starts at the top

Issue: #1066 · Status: approved · Intent: ./intent.md

## Behavior

1. When the first page of a sort, period or entity arrives, the list is scrolled to row 0 **before** the rows are
   shown (`EntityOrdersPaging.showFirstPage`), so `LazyListState` has no old key to follow.
2. The first visible row is then the API's first row: after "Cũ nhất trước" on a product, the order with the
   earliest pickup day (seed: #0017, 10/10).
3. A next page (infinite scroll) is appended without scrolling (`EntityOrdersPaging.showNextPage`).
4. Failure keeps the current behaviour (error text when there are no rows).

## Out of scope

The Orders tab lists (`OrdersHomeScreen`) and iOS.
