# Spec — Stale mobile e2e tests

Issue: #1156 · Status: done · Intent: ./intent.md

## Behavior

1. Calendar day rows (iOS `test6bCalendarOps`, Android `android-flow-calendar.sh`) are noted as
   `rows=out:<total>,back:<total>` from the row tag (Giao / Trả) and total; `calendar-check.js` builds the same list from
   `/api/calendar/orders/by-date` (RESERVED by pickup day + returns) plus, on today, the late returns of
   `/api/analytics/outlet-operations` (#938), and checks "lấy x · trả y" and today's "N trễ".
2. Grid cells and day titles read `dd/mm/yy` (#888); the iOS test taps the cell whose label equals it.
3. Orders > Việc cần làm > "Hôm nay" (iOS `test7mTodayCounters`, Android `android-flow-todo.sh`) is noted as
   `TODOLIST orders-todo-today | rows=…` from the tags Cần giao / Cần trả and totals; `todo-check.js` compares it with
   `pickupsToday` + `returnsToday`.
4. Android helpers open the cart through the Home bar "Xem giỏ" (#1079) and press the + of the − n + stepper (#1084).
5. iOS `test1dStockFlow` reads the cart availability pill as any element (a control since #1132) and the detail strip
   cell "<day>: <free>".
6. iOS `test4bOrdersSortDates` expects "Xếp theo ngày lấy · mới nhất trước" and the Lấy / Trả date chips (#1008);
   English counter labels are "Overdue returns" / "Past pickup".

## Out of scope

App code, the generic `android-e2e.sh` walk, the subscription / limit flows.

## API and data

No API change.
