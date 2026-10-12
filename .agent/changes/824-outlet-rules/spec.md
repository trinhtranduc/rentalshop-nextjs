# Spec — #824

| Area | Rule |
|---|---|
| `POST /api/outlets`, `POST /api/merchants/[id]/outlets` | MERCHANT / ADMIN only, else 403 `FORBIDDEN`. Plan limit `outlets` checked on both (`PLAN_LIMIT_EXCEEDED`). |
| `DELETE /api/outlets?id=` | MERCHANT / ADMIN only (403). 409 `OUTLET_HAS_OPEN_ORDERS`, `data.openOrders`, while RESERVED/PICKUPED non-deleted orders exist. |
| `PUT /api/outlets?id=`, `PUT /api/merchants/[id]/outlets/[outletId]` | A real `isActive` change: MERCHANT / ADMIN only (403); `false` → open-order check (409); `true` → plan limit. Other fields: OUTLET_ADMIN on its own outlet as today. Sending the current `isActive` is not a change. |
| `GET/PUT /api/merchants/[id]/outlets/[outletId]` | Every outlet role (incl. OUTLET_INVENTORY) limited to its own outlet (`isOutletRole`), else 404. |
| Login (`/api/auth/login`, `/api/mobile/auth/login`, Google) | OUTLET_* user whose outlet `isActive=false` → 403 `OUTLET_DEACTIVATED`. |
| Every authenticated request | same user → 401 `OUTLET_DEACTIVATED` (one check on the user row already loaded). |
| Plan limits | `limits.outlets` missing / null / 0 → 1; -1 unlimited; other entities unchanged. |
| `db.outlets.create` | one transaction: outlet + `OutletStock` (0/0/0) for every product of the merchant with `deletedAt = null` (`createMany`, `skipDuplicates`). |
| Migration `20261011120000_backfill_outlet_stock_zero` | INSERT … SELECT active outlet × non-deleted product of the same merchant, ON CONFLICT (productId, outletId) DO NOTHING. |
| Web `apps/client/app/outlets` | add button / dialog: flag AND MERCHANT; row disable/enable: MERCHANT only; detail "Sửa": same as row edit (`outlet.manage`). |

Error codes: `OUTLET_HAS_OPEN_ORDERS`, `OUTLET_DEACTIVATED` in `errors.ts` and `locales/*/errors.json`.
