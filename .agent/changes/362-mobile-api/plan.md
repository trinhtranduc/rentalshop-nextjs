# Plan — API for the mobile UI refresh

Issue: #362 · Status: draft · Spec: ./spec.md

Base branch: `dev`. Three PRs, smallest risk first. Each PR is backward compatible on its own.

## PR 1 — Data-correctness bugs (`fix/<issue>-order-status-guard`) · spec A, B, C

A1. **Audit first (read-only).** On a production copy or read replica, count orders per
    `(orderType, from status → to status)` from audit logs, and orders that are CANCELLED with
    `pickedUpAt` set. Record the result in the intent decision log. No write to production.
A2. Failing tests (`bug-fix-tdd`): `tests/orders/status-transition.test.ts`
    - PICKUPED→CANCELLED allowed; RETURNED→RESERVED rejected; SALE COMPLETED→PICKUPED rejected; SALE COMPLETED→CANCELLED restores stock.
    - `analytics/period` topProducts excludes a CANCELLED order.
    - SALE create with `depositAmount: 300000` stores 0.
A3. Add `ORDER_TRANSITIONS` + `assertTransition(orderType, from, to)` in `packages/constants/src/status.ts`
    (or `packages/utils/src/core/order-status.ts`), used by
    `apps/api/app/api/orders/[orderId]/status/route.ts` and `apps/api/app/api/orders/[orderId]/route.ts` (PUT, before `db.orders.update`).
A4. `packages/utils/src/analytics/period-report.ts` (~601-637): filter `status != CANCELLED` in topProducts.
A5. `apps/api/app/api/orders/route.ts` (~807): `depositAmount`/`securityDeposit` = 0 when SALE.
A6. Reuse `INVALID_ORDER_STATUS`: English text in `ERROR_MESSAGES`, ja/ko/zh in `errors.json` (skill `i18n-keys`).
A7. Eval case `.agent/evals/cases/order-status-transition.md`.

## PR 1b — Edit order and product bugs (`fix/<issue>-edit-order-product`) · spec A2, A3 (edit-order behavior itself unchanged)

Bugs first, each with a failing test in `tests/` (`bug-fix-tdd`):
- `product-stock-update.test.ts`: PUT product with an active rental keeps `renting`; omitted outlet keeps its row; stock < renting → 400.
  Fix `apps/api/app/api/products/[id]/route.ts` (~592-625): upsert per outlet, keep `renting`.
- `order-edit-snapshot.test.ts`: editing items keeps product name/image snapshots. Fix `packages/database/src/order.ts` (~556-574) using the create mapping (`orders/route.ts` ~790).
- `product-delete.test.ts`: active order → 409; else soft delete. Fix `[id]/route.ts` (~850-999) to use `simplifiedProducts.delete`.
- Web product detail delete ignores `success` and shows "deleted" on a refusal: check it in
  `apps/client/app/products/[id]/page.tsx` (~129-131) before the 409 ships.
- PUT order response adds the four image arrays (`orders/[orderId]/route.ts` ~789-888).

Then note images: `.max(MAX_ORDER_NOTE_IMAGES)` on the four arrays in `validation-schemas.ts` (~355-361), and the same
count check for pickup/return/damage multipart fields counting strings and files (`orders/[orderId]/route.ts` ~461-507).

**Hotfix candidate:** the stock reset (4a) and snapshot loss (4b) damage production data on every product edit / item edit.
Shipped as hotfix #359 (PR #360) off `main-real`.

## PR 2 — New data for the screens (`feat/<issue>-mobile-api`) · spec D, E, F, G, H

D. Extend `GET /api/analytics/outlet-operations`
   - Route `apps/api/app/api/analytics/outlet-operations/route.ts`, query in `packages/database/src/outlet-operations.ts` (skill `api-route-standard`).
   - Query in `packages/database/src/order.ts`: two `findMany` (RESERVED by `pickupPlanAt`, PICKUPED by `returnPlanAt`)
     with upper bound = end of tomorrow (Vietnam) and no lower bound (late), same `select` as `findManyLightweight`.
   - Read `timeZone` (validate IANA via `Intl.DateTimeFormat`), default `Asia/Ho_Chi_Minh`; day keys and ranges with
     `getCalendarDayRangeInTimeZone` (`packages/utils/src/core/date-range.ts`), not the fixed +7h `getLocalDateKey` (skill `timezone-dates`).
   - Shared helper `parseTimeZoneParam(searchParams)` in `packages/utils/src/core/date-range.ts`, reused by E, F, H.
E. `amountDue`, `lateDays`
   - Helper `packages/utils/src/core/order-money.ts` (`computeAmountDue`, `computeLateDays`); reuse in `qr-code/route.ts`.
   - Add to the row mapper in `order.ts` (~1840-1920) and to the detail response. Payments: select PICKUP payments sum.
F. Calendar
   - `apps/api/app/api/calendar/orders/count/route.ts`: add `byDate`, `lateReturns` (keep `countByDate`).
   - `apps/api/app/api/calendar/orders/by-date/route.ts`: `kind` param.
   - `apps/api/app/api/calendar/orders/route.ts` (~58, 197): end bound via `getCalendarDayRangeInTimeZone`.
G. Search
   - `packages/database/src/order.ts` `buildOrderSearchConditions` (~44-100): add
     `orderItems.some.product.name` via the existing `unaccent` path; ORDER BY prefix-first when no `sortBy`.
H. `apps/api/app/api/orders/stats/route.ts`: `collateralHeld`, `lateReturns`.
Docs: `apps/api/lib/swagger/orders.ts`, `docs/` endpoint notes.

Tests (`tests/`):
- `orders-todo.test.ts` — groups, counts, same-day order, 16:59:59Z vs 17:00:00Z, `timeZone=Asia/Ho_Chi_Minh` vs `Asia/Tokyo` vs missing, run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- `order-money.test.ts` — amountDue for RESERVED / PICKUPED / refund; lateDays.
- `calendar-count.test.ts` — `countByDate` unchanged (snapshot), `byDate` returns, month-end pickup.
- `order-search.test.ts` — product name, accent-insensitive, prefix first, merchant scope.
- `orders-list-compat.test.ts` — snapshot of an existing row: no field removed or changed.

## PR 3 — Minimum app version (`feat/<issue>-app-config`) · spec I

- `apps/api/app/api/mobile/app-config/route.ts`, values from env (`IOS_MIN_VERSION`, `ANDROID_MIN_VERSION`, …),
  added to env validation with safe defaults (`0.0.0` = never force).
- Allow it without auth in `apps/api/middleware.ts`.
- Test: returns defaults when env is unset.

## Compatibility tests (every PR)

`tests/compat/` replays the exact requests the installed apps send today and asserts status and response shape:
- iOS/Android `PUT /api/orders/:id {status}` for pickup, return, cancel; iOS edit echoing the current status.
- iOS multipart create with `notesImages`; Android multipart PUT with new files only; 3 images pass.
- `GET /api/calendar/orders/count?month&year&status=RESERVED` → `countByDate` unchanged (snapshot).
- `GET /api/calendar/orders/by-date?date&status=RESERVED&limit=100` → `orders` unchanged.
- `GET /api/orders?q=<orderNumber>&limit=5` finds the order.
- `GET /api/analytics/period?startDate&endDate&groupBy=day&limit=5` keys unchanged.
- Each new error: body has `code`, string `message` ≠ code, string `error`, no `data`.

Manual: run the current store builds (iOS, Android) against dev-api after each PR: create rent/sale, pickup, return,
cancel, edit with notes, calendar, overview, delete product with an active order.

## Order of release

1. PR 3, PR 1 and PR 1b → `dev` → verify on dev-api → `main-real` (back up the production DB before merge).
2. Ship the app version that reads app-config (UI plan, phase 0).
3. PR 2 → `dev` → `main-real`. Then the apps adopt the new fields (UI plan).
4. Depends on #355 (Vietnam days in analytics) for the overview numbers; merge it before UI phase 4.

## Verify (each PR)

```bash
npx tsc --noEmit -p apps/api/tsconfig.json
yarn lint
cd tests && yarn test orders && TZ=Asia/Ho_Chi_Minh yarn test orders && TZ=UTC yarn test orders
SKIP_ENV_VALIDATION=true yarn build --filter=@rentalshop/api
```
Plus curl on dev-api: `GET /api/analytics/outlet-operations?timeZone=Asia/Ho_Chi_Minh`, `/api/calendar/orders/count?month=10&year=2026`, an invalid PATCH status → 400.

## Files

- `packages/constants/src/status.ts` — transition table
- `apps/api/app/api/orders/[orderId]/status/route.ts`, `[orderId]/route.ts` — guard
- `packages/utils/src/analytics/period-report.ts` — exclude CANCELLED
- `apps/api/app/api/orders/route.ts` — SALE deposit 0
- `apps/api/app/api/analytics/outlet-operations/route.ts`, `packages/database/src/outlet-operations.ts` — Việc cần làm
- `packages/database/src/order.ts` — row fields, search
- `packages/utils/src/core/order-money.ts` (new) — amountDue, lateDays
- `apps/api/app/api/calendar/orders/{count,by-date,}/route.ts` — calendar
- `apps/api/app/api/orders/stats/route.ts` — now figures
- `apps/api/app/api/mobile/app-config/route.ts` (new), `apps/api/middleware.ts`
- `apps/api/app/api/products/route.ts`, `products/[id]/route.ts` — stock, delete, staff prices
- `locales/*/errors.json` — new error codes

## Risks

- Guard blocks a flow merchants use today → audit A1 first; ship behind the rule list from the audit.
- Old iOS/Android call `PUT /orders/:id` with an unchanged `status` → same-status is a no-op (rule 1).
- Search ORDER BY prefix adds cost → only when `q` is present and no `sortBy`; check query time on dev data.
- `amountDue` needs a payments sum per row → one grouped query per page, not per row.

## Rollback

Each PR reverts alone. PR 1 guard can be relaxed by editing the transition table only.
New endpoints/fields are unused by installed apps, so reverting them breaks nothing in the field.
