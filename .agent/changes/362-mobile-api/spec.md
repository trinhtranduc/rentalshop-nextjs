# Spec — API for the mobile UI refresh

Issue: #362 · Status: draft · Intent: ./intent.md

## Behavior

### A. Status transitions (bug)

1. Allowed: RENT `RESERVED→PICKUPED`, `PICKUPED→RETURNED`, `RESERVED→CANCELLED`, `PICKUPED→CANCELLED`; SALE `COMPLETED→CANCELLED`,
   and legacy SALE `RESERVED→COMPLETED` (Android still offers it for old data).
   Setting the same status again is a no-op, not an error.
2. The same rules apply to `PUT /api/orders/:id` with `status` (iOS and Android change status only through PUT) and to
   `PATCH /api/orders/:id/status` (web). Any other change returns 400
   with code `INVALID_ORDER_STATUS` (existing code, already mapped by iOS) and leaves the order, stock and payments unchanged.
3. Cancelling a SALE restores stock (as today) and reverses loyalty (as today).
4. Cancelling a PICKUPED rental releases its items for availability (as today); RETURNED and CANCELLED are final.

### A2. Edit order and product data (bugs found 2026-10-03)

4a. `PUT /api/products/:id` keeps each outlet's `renting`; `available = stock − renting`; stock below `renting` → 400 `STOCK_BELOW_RENTED`.
    Outlets not in the payload keep their OutletStock rows.
4b. `PUT /api/orders/:id` that changes items keeps or fills `productName`, `productBarcode`, `productImages` snapshots (same as create).
4c. `DELETE /api/products/:id` with RESERVED or PICKUPED orders → 409 `PRODUCT_HAS_ACTIVE_ORDERS`; otherwise soft delete (`isActive=false`), matching the existing restore route.
4e. `PUT /api/orders/:id` response includes `notesImages`, `pickupNotesImages`, `returnNotesImages`, `damageNotesImages`.

### A3. Note images

4f. Note image arrays are capped at `MAX_ORDER_NOTE_IMAGES` (5) on create and update, multipart and JSON, for all four fields; strings and files both count.

### B. Cancelled orders (bug)

5. `GET /api/analytics/period` `topProducts` excludes CANCELLED orders, matching `analytics/top-products`.

### C. Sale create

6. `POST /api/orders` with `orderType=SALE` stores `depositAmount=0` and `securityDeposit=0` whatever the client sends.

### Time zone (applies to D, E, F, H)

6a. Server stores and returns UTC timestamps only. Day logic follows the caller's time zone:
    new and changed day-based endpoints accept `timeZone` (IANA, e.g. `Asia/Ho_Chi_Minh`), the same param name the
    availability endpoints already use. The apps send the device zone.
6b. Missing or invalid `timeZone`: new endpoints use `Asia/Ho_Chi_Minh`; existing endpoints keep today's default, so old apps see no change.
6c. "Today", "late", `lateDays` and every `YYYY-MM-DD` key in a response are computed in that zone.

### D. Việc cần làm

7. Extend the existing `GET /api/analytics/outlet-operations` (#350; already returns pickupsToday, returnsToday,
   overdueReturns + daysOverdue, noShows, returnsSoon, tomorrow counts, cash) with optional `timeZone` and the lists below;
   no new `/orders/todo` endpoint. Groups (RENT orders):
   - `late`: RESERVED with pickup day < date (not picked up yet), PICKUPED with return day < date;
   - `today`: RESERVED with pickup day = date, PICKUPED with return day = date;
   - `tomorrow`: same for date + 1.
8. Each row has `action` = `PICKUP` | `RETURN`, `lateDays` (0 when not late), and the list-row fields of `GET /api/orders`.
9. The response has `counts {late, today, tomorrow, total}` and per group `{pickups, returns}`.
10. A same-day pickup and return order appears in `today` once per action.
11. Days follow `timeZone`; with `Asia/Ho_Chi_Minh`, an order at 16:59:59Z and one at 17:00:00Z land on different days.
12. CANCELLED, RETURNED and SALE orders never appear.

### E. List-row fields (additive)

13. `GET /api/orders` and `GET /api/orders/:id` rows add:
    - `amountDue`: RESERVED → `total − deposit + securityDeposit − PICKUP payments` (same formula as `qr-code/route.ts:122`);
      PICKUPED → `lateFee + damageFee − securityDeposit` (negative = refund); else 0.
    - `lateDays`: days (in `timeZone`) past `returnPlanAt` for PICKUPED, past `pickupPlanAt` for RESERVED, else 0.
14. No existing field changes value or type.

### F. Calendar (additive)

15. `GET /api/calendar/orders/count` keeps `countByDate` unchanged and adds
    `byDate {YYYY-MM-DD: {pickups, returns}}` (pickups = RESERVED by `pickupPlanAt`, returns = PICKUPED by `returnPlanAt`)
    and `lateReturns` (PICKUPED with return day < today).
16. `GET /api/calendar/orders/by-date` keeps its default and accepts `kind=pickup|return|all`;
    `return` lists PICKUPED by `returnPlanAt`.
17. `GET /api/calendar/orders` includes pickups on the last day of the range until 23:59:59 Vietnam time.

### G. Search (additive)

18. `q` also matches product names in the order's items, accent-insensitively.
19. Matching stays "contains"; when no explicit `sortBy` is sent, rows whose name, phone or order number start with `q` come first.
20. Search stays scoped to the caller's merchant/outlet.

### H. Overview "now" figures (additive)

21. `GET /api/orders/stats` adds `collateralHeld` (sum of `securityDeposit` of PICKUPED orders now) next to the existing `activeRentals`, and `lateReturns`.

### I. Minimum app version (additive)

22. `GET /api/mobile/app-config` (public, no auth) returns `{ios: {minVersion, latestVersion, storeUrl}, android: {…}, features: {newOrders, newDetail, newCalendar, …}}` from env/config; features default to false and let the apps switch new screens on or off without a release.
23. Changing the minimum needs no deploy of the apps; values come from config.

## Out of scope

- Global API versioning; renaming fields; removing fields.
- Automatic late-fee calculation.
- Stock-shortage flag on list rows.
- Barcode unique per merchant instead of global (needs a migration; separate issue).
- Product image count limit.
- Staff price fields on product create: web lets `OUTLET_STAFF` create products with prices and `rentPrice` is required;
  stripping them would fail or create 0-price products. Separate issue (web UI + API together).
- Edit-order rules: what can be edited per status, server total recompute, availability check and staff price lock stay as they work today (decision 2026-10-03).
- Analytics UTC→VN day (#355).
- Mobile UI work (separate plan: `../363-mobile-ui/`).

## Compatibility with installed apps (checked 2026-10-03)

C1. No field is removed, renamed or changes type; no new `OrderStatus` value (iOS `OrderStatus` throws on unknown values).
C2. New errors keep the shape `{success:false, code, message, error:<string>}` with no `data` (iOS decodes `data: T?`, `error: String?`).
C3. Every new code has an English `ERROR_MESSAGES` entry in `packages/utils/src/api/response-builder.ts` (else iOS shows the raw code and
    Android shows "Request failed") and `errors.json` in five locales (web).
C4. Kept exactly as today when called without the new params: `GET /api/calendar/orders/count` (`countByDate`),
    `GET /api/calendar/orders/by-date` (default filter), `GET /api/calendar/orders` (`calendar[].orders`, `summary.total`),
    `GET /api/orders?q=` (order-number match with `limit=5` still finds the order), `GET /api/analytics/period` response shape.
C5. Note image cap counts existing + new ≤ 5; installed apps cap at 3, so they never hit it.
C6. Status guard: every transition the installed apps can trigger is allowed (iOS/Android: pickup, return, cancel RESERVED or SALE COMPLETED;
    web: same via PATCH). Same status = no-op.
C7. Numbers that change on purpose (release note): top products without cancelled orders; analytics days (#355).

## API and data

- No schema change. External ids stay numeric `publicId`.
- Error codes: `INVALID_ORDER_STATUS` (existing), `STOCK_BELOW_RENTED` (added by #359), new `PRODUCT_HAS_ACTIVE_ORDERS` → `errors.json` in en, vi, ja, ko, zh.
- All new endpoints use `withPermissions(['orders.view'])` and `userScope` like `GET /api/orders` (except app-config, public).

## Acceptance

- [ ] Each behavior line has a test named in `plan.md`
- [ ] Old field values unchanged (snapshot test on `GET /api/orders` row)
- [ ] iOS and Android: no change needed to keep working; new fields consumed in the UI plan
- [ ] `INVALID_ORDER_STATUS` and new codes in five locales and `ERROR_MESSAGES`
- [ ] Cancelled orders excluded, Vietnam days, role scope hold
