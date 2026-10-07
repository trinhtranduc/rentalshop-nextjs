# Spec — Admin moves a user account to another merchant

Issue: #443 · Status: draft · Intent: ./intent.md

Applies to `PUT /api/users/:id`, `PUT /api/users` (id in body) and `PUT /api/merchants/:id/users/:userId`,
after the #366 scope checks. "Access change" = merchant, outlet or role differs from the stored value.

## Behavior

1. Only ADMIN may set a user's merchant to a different merchant. Others get 403
   `MERCHANT_TRANSFER_ADMIN_ONLY` (merchant/outlet callers are already stopped by `isAllowedPlacement`, 403 `FORBIDDEN`).
2. The destination merchant must exist and be active, else 404 `MERCHANT_NOT_FOUND`.
3. A `MERCHANT` user is never moved to another merchant, and nobody is moved in as `MERCHANT`:
   409 `MERCHANT_OWNER_TRANSFER_NOT_SUPPORTED`.
4. On a move, an outlet not named in the request is cleared. An outlet role without an outlet gets
   400 `OUTLET_ASSIGNMENT_REQUIRED`.
5. A new outlet must exist and be active (404 `OUTLET_NOT_FOUND`) and belong to the target merchant
   (400 `OUTLET_MERCHANT_MISMATCH`). An unchanged outlet is not re-checked.
6. A tenant role (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`) left without a merchant gets 400
   `MERCHANT_ASSOCIATION_REQUIRED`. `ARTICLE` and `OPS` lose merchant and outlet.
7. Demoting or moving the last active owner of a merchant gets 409 `CANNOT_TRANSFER_LAST_MERCHANT_OWNER`.
8. A move of an active tenant user calls `assertPlanLimit(targetMerchantId, 'users')`; over the limit →
   `PLAN_LIMIT_EXCEEDED` (403, as `ApiError` defines it) and nothing is written.
9. On an access change, `permissionsChangedAt` is set in the same update and all of the user's sessions
   are invalidated. A name-only edit changes neither.
10. Each successful update writes an audit `logUpdate` with old and new values, without `password`.
11. `PUT /api/users`: a caller out of scope (`canAccessUser`) gets 403 `UPDATE_USER_OUT_OF_SCOPE`; a merchant/
    outlet caller placing a user outside its merchant/outlet gets 403 `FORBIDDEN`. Unexpected errors go
    through `handleApiError`.
12. Products, orders and customers are not touched.
13. Admin `UserForm` in edit mode loads merchants (ADMIN) and the selected merchant's outlets; changing
    the merchant clears the outlet.

## Out of scope

- Ownership transfer between merchants.
- Moving orders/products/customers.
- Mobile UI (POS apps do not move users between merchants).
- Replacing the role check of `PUT /api/users` with `canAssignRole`.

## API and data

- No new fields. Request shape unchanged (`merchantId`, `outletId` already in `userUpdateSchema`).
- New error codes: `MERCHANT_TRANSFER_ADMIN_ONLY`, `MERCHANT_OWNER_TRANSFER_NOT_SUPPORTED`,
  `OUTLET_ASSIGNMENT_REQUIRED`, `OUTLET_MERCHANT_MISMATCH`, `CANNOT_TRANSFER_LAST_MERCHANT_OWNER`.
- Existing column `User.permissionsChangedAt` now also set by these routes.

## Acceptance

- [x] Each behavior line has a test in `tests/api/user-merchant-transfer.test.ts` or is a UI change named in `plan.md`
- [x] iOS and Android: no change needed; compatibility table in the PR
- [x] New error codes in all five `locales/*/errors.json`
- [x] Role limits from #366 still hold (`user-route-scope`, `user-responses-scope` tests green)
