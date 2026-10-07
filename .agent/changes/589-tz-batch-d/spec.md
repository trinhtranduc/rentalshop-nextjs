# Spec — Timezone batch D (#589)

See #578 spec §D.

- **D1 (WEB-2)** One `useShopToday()` hook returns the Vietnam day key. It recomputes on `focus`, on
  `visibilitychange` (visible) and on a timer at the next Vietnam midnight. These pages use it: dashboard,
  orders, order page, Tạo/Sửa đơn, calendar, availability, customers, customer page, customer orders and
  product orders. The dashboard reloads "Việc hôm nay" when the day changes. Proof: set the browser clock to
  2026-10-05T16:30:00Z, fast-forward 1 h, focus. The dashboard then shows 06/10 and requests `startDate=2026-10-06`.
- **D2 (WEB-3)** When the chosen Vietnam day equals the day of the order's original instant, Sửa đơn sends
  that original `pickupPlanAt`/`returnPlanAt` instant. A changed day sends 00:00 Vietnam of the new day, as before.
- **D3 (WEB-4)** "Hết hạn N ngày trước" counts the civil days from the Vietnam day of `currentPeriodEnd` to
  Vietnam today.
- **#579** `/availability?productId=X` always opens product X, in any load order. In the #573 web suite, the
  check "availability: the product page link (?productId=) opens that product" becomes a normal check.

Tests run at 16:59:59Z / 17:00:00Z under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
