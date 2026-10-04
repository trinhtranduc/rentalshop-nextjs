# Spec — A merchant without an outlet cannot create an order

Issue: #398 · Status: accepted · Intent: ./intent.md

## Behavior

1. MERCHANT, body without `outletId`, the merchant has an active outlet with `isDefault = true` → the
   order is created on that outlet.
2. MERCHANT, no `outletId`, no active default, exactly one active outlet → the order is created on it.
3. MERCHANT, no `outletId`, no active default, zero or several active outlets → 400 `OUTLET_REQUIRED`;
   nothing is written.
4. An inactive default outlet is never picked.
5. MERCHANT with an explicit `outletId` of their own merchant → that outlet (unchanged).
6. MERCHANT with an explicit `outletId` of another merchant → 403
   `CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT` (unchanged).
7. OUTLET_ADMIN / OUTLET_STAFF without `outletId` → their own outlet; with another outlet → 403
   (unchanged).
8. ADMIN with an explicit `outletId` → that outlet (unchanged). ADMIN without `outletId` keeps the
   validation error (unchanged).
9. The lookup is scoped by the caller's merchant (`db.outlets.findDefaultForMerchant(merchantId)`).
10. The availability routes the apps call before checkout (`GET /api/products/:id/availability`,
    `GET /api/products/:id/availability-calendar`, `GET /api/products/availability`,
    `POST /api/products/batch-availability`) failed the same way (400 `OUTLET_REQUIRED` for a merchant
    without `outletId`). They resolve the outlet the same way; with no default and several outlets they
    keep 400 `OUTLET_REQUIRED`. Explicit `outletId`, outlet roles and ADMIN are unchanged.

## Out of scope

- `PUT /api/orders` and `/api/orders/:id` (an update keeps the order's outlet).
- Choosing an outlet in the mobile UI.
- Making an outlet default from the admin UI.

## API and data

- `POST /api/orders`: `outletId` stays in the body schema; the route fills it before validation.
- Error code `OUTLET_REQUIRED` (400) already existed (availability routes, en/vi `errors.json`, iOS
  `ErrorCodes.swift`). This change gives it a readable message: `ERROR_MESSAGES` in `response-builder.ts`
  (old Android showed "Request failed" for the raw code), clearer en/vi text, new ja/ko/zh entries,
  `locales/vi/errors-mobile.json`, iOS text + HTTP status 400, Android `ApiErrorMessages` + `strings.xml` (en, vi).
- No response shape change. No schema change.

## Acceptance

- [x] Each behavior line has a test in `tests/api/order-create-merchant-default-outlet.test.ts` (34 tests)
- [x] iOS and Android called out: no request change needed; new code mapped on both
- [x] `OUTLET_REQUIRED` in all five locales
- [x] Role limits still hold (tests 5–8)
