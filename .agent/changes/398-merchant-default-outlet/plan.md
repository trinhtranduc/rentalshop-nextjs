# Plan — A merchant without an outlet cannot create an order

Issue: #398 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing test `tests/api/order-create-merchant-default-outlet.test.ts` (spec 1–9), mocking `db` and auth
   like `tests/api/order-put-status.test.ts`. Commit alone (`bug-fix-tdd`).
2. `packages/database/src/outlet.ts`: `simplifiedOutlets.findDefaultForMerchant(merchantId)` — active
   default outlet of that merchant, else the only active outlet, else `null`.
3. `apps/api/app/api/orders/route.ts` POST: before `orderCreateSchema.safeParse`, a MERCHANT without
   `body.outletId` gets it from `findDefaultForMerchant(userScope.merchantId)`; `null` → 400
   `OUTLET_REQUIRED`. The existing merchant check after `findById` stays.
4. `OUTLET_REQUIRED` (existing code): readable message in `packages/utils/src/api/response-builder.ts`,
   `locales/*/errors.json`, `locales/vi/errors-mobile.json`, iOS `ErrorCodes.swift` + `Localizable.strings`,
   Android `ApiErrorMessages.kt` + `strings.xml` (`i18n-keys`, `mobile-parity`).
5. Check the other mobile routes that take an outlet (availability, preview/QR, calendar,
   outlet-operations); fix only those that fail the same way. Result below: the four availability
   routes failed and are fixed the same way.
6. Verify: new test, full `tests/` vs baseline, `npx tsc --noEmit -p apps/api/tsconfig.json` vs `origin/dev`,
   optional local API run against the e2e DB.

## Files

- `packages/database/src/outlet.ts` — scoped lookup
- `apps/api/app/api/orders/route.ts` — fallback before validation
- `apps/api/app/api/products/{[id]/availability,[id]/availability-calendar,availability,batch-availability}/route.ts` — same fallback
- error-code and locale files above — new code
- `tests/api/order-create-merchant-default-outlet.test.ts` — regression

## Routes checked (step 5)

A MERCHANT login has `userScope = { merchantId }`, no `outletId`. iOS omits a nil `outletId`; Android has none.

| Route | Merchant without `outletId` before | Action |
|---|---|---|
| `POST /api/orders` | 400 `VALIDATION_ERROR` (outletId NaN) | fixed |
| `GET /api/products/:id/availability` | 400 `OUTLET_REQUIRED` | fixed |
| `GET /api/products/:id/availability-calendar` | 400 `OUTLET_REQUIRED` | fixed |
| `GET /api/products/availability` | 400 `OUTLET_REQUIRED` | fixed |
| `POST /api/products/batch-availability` | 400 `OUTLET_REQUIRED` | fixed |
| `GET /api/orders/:id/qr-code` | works (uses `order.outletId`) | none |
| order preview | no API route (iOS `PreviewViewController` calls `POST /api/orders`) | none |
| `GET /api/calendar/orders`, `/by-date`, `/count` | works, merchant-wide (`calendarScopeWhere`) | none |
| `GET /api/analytics/outlet-operations` | works, all merchant outlets | none |

## API compatibility (installed apps)

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| `POST /api/orders` | MERCHANT without `outletId` → default outlet (else only active outlet, else 400 `OUTLET_REQUIRED`) | body has no `outletId` (`Model/Cart.swift:989`, `:1036` on `origin/main-real`); was 400, now 200 | body has no `outletId` (`data/ApiClient.kt:341` `createOrder` on `origin/main-real`); was 400, now 200 | web sends `outletId`; unchanged | none (400 → 200) |
| `GET /api/products/:id/availability`, `/availability-calendar`, `/products/availability`, `POST /products/batch-availability` | MERCHANT without `outletId` → default outlet | omits nil `outletId` (`Library/Services/OrderService.swift:737` and siblings on `origin/main-real`); was 400, now 200, same response shape | `DefaultAvailabilityRepository.kt:70/94/270` throws on the device before the call; unchanged (no request sent) | sends `outletId`; unchanged | none |
| Error `OUTLET_REQUIRED` | was already sent by availability routes; now also by `POST /api/orders` when no default and several outlets (was `VALIDATION_ERROR`, also 400). `message` is now a sentence instead of the raw code | maps the code to bundled text (`Model/ErrorCodes.swift:369`, `Localizable.strings:1169`) | `ApiErrorMessages.resolve` shows `message` unless it looks like a code (`domain/error/ApiErrorMessages.kt:15-20`); now shows the English sentence instead of "Request failed" | n/a | low (same status, better text) |
| `db.outlets.findDefaultForMerchant` | new helper, merchant-scoped | n/a | n/a | n/a | none |
| Response fields, request params, auth, pagination, migrations, env | unchanged | — | — | — | none |

Not verified on a device: old app builds were not run. Evidence is the `origin/main-real` code above and
the local API run below.

## Verification

- `cd tests && yarn test api/order-create-merchant-default-outlet` — 34 passed (15 failed before the fix).
- `cd tests && yarn test` — Test Suites: 26 failed, 61 passed, 87 total; Tests: 3 failed, 765 passed. Failing
  suites are a subset of the `origin/dev` baseline (27): no new failure.
- `npx tsc --noEmit -p apps/api/tsconfig.json` with worktree-built package dists — 69 errors on `origin/dev`
  and 69 on this branch, identical set; none new in the changed files.
- Local API (`next dev -p 3182`, `anyrent_mobile_e2e`): `merchant2@example.com` (MERCHANT, `outletId: null`)
  `POST /api/orders` SALE without `outletId` → 200 `ORDER_CREATED_SUCCESS`, `outletId: 2` (the merchant's
  default "Main Branch"); `GET /api/products/31/availability` and `POST /api/products/batch-availability`
  without `outletId` → 200 on outlet 2.
- iOS / Android builds not run: the mobile diff is one error mapping and strings.

## Risks

- A merchant with several outlets and no default now gets `OUTLET_REQUIRED` instead of
  `VALIDATION_ERROR`: still a 400, readable text on old apps (they show `message`).
- No migration. No response shape change.
- Android availability (`DefaultAvailabilityRepository`) still refuses on the device for a merchant
  without an outlet; the server fix does not reach it. Follow-up in the mobile apps.

## Rollback

Revert the fix commit. Behavior returns to 400 `VALIDATION_ERROR` for merchants without `outletId`.
