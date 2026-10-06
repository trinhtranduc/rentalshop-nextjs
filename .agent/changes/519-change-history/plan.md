# Plan — Readable change history

Issue: #519 · Status: in progress · Spec: ./spec.md

## Steps

1. `apps/api/lib/change-timeline.ts` — pure: snapshot builders, diff, kind classifier, entry builder.
2. `apps/api/lib/change-history-scope.ts` — order/product access check for history reads.
3. `packages/utils/src/core/audit-config.ts` — stop redacting `Order.totalAmount`; record product fields.
   `audit-helper.ts` — deep-compare changes (no Date/array noise); `logCustom` keeps old/new values.
4. Write paths pass snapshots: orders POST/PUT, orders/[id] PUT, orders/[id]/status, products POST,
   products/[id] PUT/DELETE, payments/process (order payment row).
5. Scope `/history`; add `/changes` routes (`api-route-standard`).
6. Tests in `tests/api/` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`; type-check the API.

## Files

- `apps/api/lib/change-timeline.ts`, `apps/api/lib/change-history-scope.ts` — new
- `apps/api/app/api/{orders/[orderId],products/[id]}/{history,changes}/route.ts`
- write routes listed above, `packages/utils/src/core/audit-{config,helper}.ts`

## Risks

- Revert route reuses `oldValues`: `updateOrder` whitelists fields, so new snapshot keys are ignored.
- Products are filtered for staff by `AuditLog.outletId`: owner edits are hidden from staff.

## Rollback

Revert the commit. Rows written meanwhile stay readable by `/history`.
