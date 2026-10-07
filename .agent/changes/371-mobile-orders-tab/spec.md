# Spec — Mobile orders tab

Issue: #371 · Status: accepted · Intent: ./intent.md

## Behavior

1. Flag `newOrders` off → old order list, unchanged. On → new tab (read when the tabs are built).
2. Segments `Việc cần làm | Tất cả đơn | Đơn bán`; default Việc cần làm. A 403 from outlet-operations hides it and opens Tất cả đơn.
3. Việc cần làm (`outlet-operations?timeZone=<device>`):
   - TRỄ HẠN = `noShows` + `overdueReturns`, most late first, row note "Trễ N ngày".
   - HÔM NAY = `pickupsToday` (Giao) + `returnsToday` (Nhận lại).
   - NGÀY MAI = `tomorrowPickups` + `tomorrowReturns`; hidden when the API omits them.
   - Row: order number, customer, masked phone + call, product names, "Chưa soạn" on a hand-over not ready,
     amount (`amountDue` hand-over, `refundDue` return). Empty groups hidden; all empty → empty state.
4. Tất cả đơn: RENT, 20 per page, filter sheet status (Tất cả/Đã đặt/Đang thuê/Đã trả/Đã hủy) and sort
   (Ngày thuê/Ngày tạo, newest first). "Trễ N ngày" when RESERVED past pickup day or PICKUPED past return day.
5. Đơn bán: SALE by `createdAt` desc, grouped by device-TZ day ("T7 03/10"), tag Hoàn thành / Đã hủy, paged.
6. Search: as you type, 300 ms debounce, ≥ 2 characters, `q` without `orderType`, flat list with type tag.
   A response for old text is dropped. Clearing returns to the segment.
7. Row tap opens the existing order detail; coming back refreshes. Pull to refresh everywhere.
   Money hidden for `OUTLET_STAFF` when "hide financial data for staff" is on.
8. Loading, empty and error (with retry) states. A segment switch resets paging and never shows the previous segment's rows.

## Out of scope

New order detail (#372), create/edit order, calendar, overview, any API change.

## API and data

Reads only. `outlet-operations` rows: numeric `id`, `amountDue`, `refundDue`, `lateDays`, `items`,
`productNames`, `isReadyToDeliver`. `tomorrowPickups`/`tomorrowReturns` are optional.

## Acceptance

- [ ] Unit tests on both apps for parsing, grouping, late days, stale search
- [ ] iOS and Android both ship the screen
- [ ] New strings in vi and en (the apps have no ja/ko/zh)
- [ ] Vietnam/device civil days hold across midnight
