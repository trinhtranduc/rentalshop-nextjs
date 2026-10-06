# Intent — #527 Shop web Lịch giao trả + Kiểm tra còn hàng

Issue: #527 · Part of the shop web redesign (boards `Lich`, `Kiem-tra`)

## What

Redraw two screens of the shop web (`apps/client`) to the approved boards:

- `/calendar` (Lịch giao trả): a month of hand-overs and returns on Vietnam civil days, today marked, month navigation, and a panel with the chosen day's orders.
- `/availability` (Kiểm tra còn hàng): one product and a period → "Còn n/m" for the whole period, units free per day, the orders holding the product, and same-category products still free.

## Why

The old calendar only counted hand-overs and opened a modal; the counter needs "what goes out and what comes back today" at a glance. The old availability page was a light-only multi-product form; the board answers the one question asked at the counter ("còn cái này cho mấy ngày đó không?") and shows why.

## Constraints

- UI only. Reuse the existing calls: `GET /api/calendar/orders/count` (`byDate`, `lateReturns`), `GET /api/calendar/orders/by-date` (RESERVED; `kind=return` for returns), `GET /api/analytics/outlet-operations` (late returns, today), `GET /api/products/{id}/availability`, `GET /api/orders?productId=`, `GET /api/products`, `POST /api/products/batch-availability`, `GET /api/outlets`. No API change.
- Days are Vietnam civil days (`Asia/Ho_Chi_Minh`); a same-day pickup and return still occupies that day.
- Outlet: the user's outlet; a merchant without one picks among its outlets (default first).
- `packages/ui` is not edited (admin keeps the old components). Light and dark themes, 390px wide.
- New strings in `locales/{en,vi}/{calendar,availability}.json` under `web` (these namespaces exist only in en and vi).
