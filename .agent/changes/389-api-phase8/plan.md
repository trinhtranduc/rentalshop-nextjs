# Plan — API phase 8

Issue: #389 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first (`tests/`), red before the code:
   - `tests/api/order-balance-batch.test.ts` — rows get `amountDue`/`refundDue` from grouped payments; CANCELLED = 0/0 (spec 1–2, 8).
   - `tests/packages/database/order-nearest-task.test.ts` — nearest-task comparator and page planner; late first,
     closed last, nulls after dated, pagination across the open/closed boundary (spec 3–5).
   - `tests/packages/database/order-date-range.test.ts` — `pickupPlanAt` / `returnPlanAt` exact VN bounds + `not: null` (spec 6–7).
   - `tests/api/product-soft-delete.test.ts` — open-order check (RESERVED/PICKUPED, merchant products only), soft-delete
     data, 409 code and message (spec 9–10, 14).
   - `tests/packages/database/product-deleted-filter.test.ts` — search / findById / count exclude `deletedAt` (spec 12).
   Run date tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
2. Schema: `Product.deletedAt DateTime?` + new migration `prisma/migrations/20261004120000_product_deleted_at` (`db-migration`).
3. Orders list (`api-route-standard`, `timezone-dates`):
   - `packages/utils/src/core/validation-schemas.ts` — `sortBy` + `nearestTask`, `dateField` + `pickupPlanAt`/`returnPlanAt`.
   - `packages/database/src/order-date-range.ts` — planned fields allowed.
   - `packages/database/src/order-nearest-task.ts` (new, import-light) + `findManyLightweight` uses it.
   - `apps/api/lib/order-balance-batch.ts` (new) + `apps/api/app/api/orders/route.ts` attaches the balance.
4. Calendar: `apps/api/app/api/calendar/orders/by-date/route.ts` attaches balance + `lateFee`;
   `packages/utils/src/api/calendar.ts` type gets the optional fields.
5. Product soft delete:
   - `apps/api/lib/product-soft-delete.ts` (new): open-order count + soft-delete update.
   - `apps/api/app/api/products/[id]/route.ts` DELETE, `apps/api/app/api/products/batch-delete/route.ts`.
   - `packages/database/src/product.ts` (`findById`, `findByBarcode`, `findByIds`, `search`, raw name search),
     `apps/api/app/api/products/batch-availability/route.ts`, `packages/utils/src/core/validation/entity-counts.ts`,
     `apps/api/app/api/categories/[id]/route.ts` count.
   - Error code: `packages/utils/src/api/response-builder.ts` message, `locales/*/errors.json`, `locales/vi/errors-mobile.json`,
     iOS `ErrorCodes.swift` + `Localizable.strings` (en, vi), Android `ApiErrorMessages` + `strings.xml` (en, vi) (`i18n-keys`).
   - Web: `apps/client/app/products/[id]/page.tsx` checks `response.success` before toasting and leaving.
6. Verify (`verify-change`): tests vs `fail-base.txt`, `tsc` for api + client, API build, run on :3188 against
   `anyrent_mobile_e2e` with samples for each item.

## Files

- `prisma/schema.prisma`, `prisma/migrations/20261004120000_product_deleted_at/migration.sql` — new nullable column
- `packages/database/src/{order.ts,order-date-range.ts,order-nearest-task.ts,product.ts}` — list sort/filter, deleted filter
- `packages/utils/src/{core/validation-schemas.ts,api/calendar.ts,api/response-builder.ts,core/validation/entity-counts.ts}`
- `apps/api/lib/{order-balance-batch.ts,product-soft-delete.ts}`
- `apps/api/app/api/{orders,calendar/orders/by-date,products/[id],products/batch-delete,products/batch-availability,categories/[id]}/route.ts`
- `apps/client/app/products/[id]/page.tsx` — the pending "PR 1b"
- `locales/*/errors.json`, `locales/vi/errors-mobile.json`, iOS/Android error tables

## API compatibility (installed apps)

Old-app code read on `origin/main-real`.

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| `GET /api/orders` rows | added `amountDue`, `refundDue` (numbers, always present) | `Order` decodes with explicit `CodingKeys` (`Model/Order.swift:160-221`); `amountDue` there is a computed var (`Order.swift:433`), not decoded → key ignored | `parseOrderSummary` reads named keys with `opt*` (`data/ApiClient.kt:1098`) → ignored | `ordersApi` passes rows through; extra keys unused | none |
| `GET /api/orders` `sortBy` | new value `nearestTask`; default stays `createdAt` | never sends it | sends `createdAt`/`pickupPlanAt` only (`ui/orders/OrdersScreens.kt:168-170`, `ApiClient.kt:208`) | not sent | none |
| `GET /api/orders` `dateField` | new values `pickupPlanAt`, `returnPlanAt`; old values unchanged | not affected | sends old values only (`ui/settings/ExportScreens.kt:123`, `ApiClient.kt:210`) | old values only | none |
| `GET /api/calendar/orders/by-date` rows | added `amountDue`, `refundDue`, `lateFee` | `CalendarOrderByDate` has explicit `CodingKeys` without them (`Library/Services/APIResponse.swift:1577-1610`) → ignored | parsed by named keys (`ApiClient.kt:775`) → ignored | `CalendarOrderSummary` gets optional fields | none |
| `DELETE /api/products/{id}` success | soft delete instead of hard delete; same `{id,name,images}`; message text changed | `ProductService.deleteProduct` checks `success` only (`Library/Services/ProductService.swift:248-279`) then removes the row (`ViewModels/MainViewModel.swift:130-145`) | `deleteProduct` ignores the body (`ApiClient.kt:615`, `ApiParity.kt:347`), list refreshes (`ui/home/HomeScreens.kt:479-484`) | list page checks `success` | none — product disappears from lists as before |
| `DELETE /api/products/{id}` open orders | new 409 `PRODUCT_HAS_OPEN_ORDERS` (before: hard delete always succeeded) | AF without `validate()` → body decoded, `success=false` → `createErrorFromResponse`; unknown code falls back to the English `message` (`Model/ErrorCodes.swift:1318-1323`), shown by `UIAlertController.errorAlert` (`Viewcontrollers/Main /MainViewController.swift:880-887`) | non-2xx → `AppError.Http(json.errorMessage())` (`ApiClient.kt:916-922`) → `AppAlertError` with the English message (`HomeScreens.kt:485`) | detail page fixed in this PR; list page already checks `success`; global handler translates the code | low — old apps show an English sentence; the product is not deleted (intended rule) |
| `POST /api/products/batch-delete` | soft delete; open-order products go to `errors[]` | not called | not called | client/admin read `deleted` / `failed` counts | none |
| Product lists, search, barcode, image search, availability, detail | deleted products hidden / 404 | same as a hard-deleted product before | same | same | none |
| `GET /api/orders?productId=<deleted product>` | 404 `PRODUCT_NOT_FOUND` (route validates the product) | same as a hard-deleted product before | same | same | none |
| Order create with a deleted product id | `Product with ID … not found` (`findById` null) | same as hard delete before | same | same | none |
| Plan-limit product count | excludes deleted products | n/a | n/a | n/a | none (hard delete also freed the slot) |
| Migration | `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)` — nullable, no default, no backfill, no lock beyond a catalog update | n/a | n/a | n/a | low — additive; human review per `review-pr` |

Old orders that contain a product deleted *before* this change still show their item snapshot (unchanged).

## Verification (2026-10-04)

- Tests: `cd tests && yarn test` → 26 failing suites vs 27 in `fail-base.txt`, no new failing suite
  (`validate-addon-deletion` also passes here). New suites green under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh` (64 tests).
- Type-check: `npx tsc --noEmit -p apps/api/tsconfig.json` after the build has 95 lines of errors, none in the changed
  code (2 pre-existing loyalty errors in `orders/route.ts` POST); `apps/client` has no error in `products/[id]/page.tsx`.
- Build: `turbo run build --filter=@rentalshop/api --force` → Compiled successfully.
- Run on :3188 against `anyrent_mobile_e2e` as merchant2: samples for every item; `nearestTask` order equals a SQL
  reference over all 61 orders; planned ranges match SQL counts (13 / 5).
- Query cost, 100k orders + 200k payments in a rolled-back transaction: payment sums 0.16 ms (50-row page) /
  0.88 ms (500-row page) on `Payment_orderId_status_idx`; `nearestTask` per open segment ~4 ms count + ~4 ms sorted
  read (page 1) / 5.5 ms (take 1000) via `Order_status_outletId_idx`; default list page 0.03 ms. Seed DB endpoint
  averages (20 runs): list 10.6 ms, nearestTask 11.0 ms, nearestTask limit 500 15.1 ms, by-date 6.9 ms.

## Risks

- Any product query not listed above still sees soft-deleted rows. Mitigated: soft delete also sets `isActive=false`,
  and most legacy queries already filter `isActive: true`.
- Barcode stays reserved by a deleted product (unique column). Known limit.
- `nearestTask` deep pages read `page × limit` light rows per open status; fine for shop-sized open sets.

## Rollback

Revert the PR. The `deletedAt` column can stay (nullable, unused); products soft-deleted meanwhile would reappear
with `isActive=false` (inactive), which the list's inactive filter shows.
