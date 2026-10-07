# Spec — mobile top lists "Xem tất cả"

Status: accepted · Intent: ./intent.md

1. Each top card (Top sản phẩm, Top khách hàng) shows "Xem tất cả" in its title row when it has at least one row;
   none while loading, on error, or when empty.
2. Tapping it opens a screen titled like the card, with the period under the title, listing up to 50 rows from the
   same endpoint with `limit=50`, same range as the card.
3. Rows keep the API order (largest revenue first) and are the card's row (name, amount, rentals for products /
   orders for customers, bar ratio against the first row). No rank number, as on the card.
4. A row with an id opens the same screen the card row opens; a row without id is not tappable.
5. Loading shows a spinner; failure shows the error text and a retry; empty shows the card's empty text.
6. The card itself still shows 5 rows and still asks `limit=5`.
7. iOS and Android match.

Out of scope: paging beyond 50, sort by quantity, export, any web/API change.

Tests: iOS `OverviewDashLogicTests` (row limit 5 vs 50, request parameters carry `limit`), Android unit test for the
same pure helpers. Builds on both platforms; screenshots on simulator / emulator.
