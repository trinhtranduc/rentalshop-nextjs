# Spec — Release e2e: full local test of both mobile apps

Issue: #391 · Status: accepted · Intent: ./intent.md

## Behavior

Each line is checked on iOS and Android, as merchant (`merchant1@example.com`) and as outlet staff
(`staff.outlet1@example.com`) unless it says otherwise. Result: pass, fail (bug entry), or not run (reason).

1. Auth: sign-up ends on the activation "email sent" screen; login works; a wrong password shows an error and stays
   on login; forgot password sends or shows the rate-limit message; onboarding shows once and can be skipped; logout
   returns to login.
2. Home: product list loads; + adds to the cart; the cart bar count rises; "Tạo đơn" opens the cart.
3. Cart: a RENT and a SALE order can be created with an existing customer and with a new one, with deposit and
   discount; an over-booked product shows an availability warning.
4. Order detail: Giao đồ, Nhận trả, Hủy, Sửa, Gia hạn, print preview, payments.
5. Orders tab: Việc cần làm, Tất cả đơn, filters incl. Việc gần nhất and planned ranges; search by name, phone and
   order code, accent-insensitive.
6. Calendar: tapping a day lists that Vietnam civil day's orders; money rows are shown.
7. Products: detail availability strip and order chips; edit; delete, incl. the 409 when the product has orders.
8. Customers: list, detail ("Tổng chi" excludes cancelled orders), edit, "Tạo đơn cho khách này".
9. Overview: cards, drill-downs, top products.
10. Settings: counts, users.
11. Staff: cannot edit prices, cannot delete products, sees only its own outlet.
12. Flags off (`MOBILE_FEATURES` empty, API restarted, apps reinstalled): the old screens still open on both apps.

## Out of scope

Fixing app or API bugs. Store builds. Railway dev. Dark mode, Dynamic Type and small screens beyond what the run
happens to show.

## API and data

None changed. The local seed (`scripts/regenerate-entire-system-2025.js`) provides 2 merchants, 4 outlets,
60 products, 60 customers and 120 orders.

## Acceptance

- [ ] Each behavior line has a result per platform and role in the final report
- [ ] Every fail has a bug entry with steps, platform, role and screenshot path
- [ ] iOS UI test and Android scenario changes are committed; no temporary hacks committed
- [ ] API, simulator and emulator stopped; derived data and Android build output deleted
