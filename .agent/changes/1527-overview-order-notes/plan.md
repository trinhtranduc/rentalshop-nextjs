# Plan — Order notes in Tổng quan › Đơn cần làm hôm nay (web)

Issue: #1527 · Status: in-progress · Spec: ./spec.md

## Steps

1. Tests first (they fail before the code):
   - `tests/packages/database/outlet-operations.test.ts`: the row select asks for `notes` on the order and items (spec 1, 2).
   - `tests/api/outlet-operations-route.test.ts`: `notes` and `items[].notes` trimmed, blank → `null`, old fields kept (spec 1–3).
   - `tests/web-overview-model.test.ts`: `buildTodayRows` carries `notes` / `itemNotes`; `notedRowCount` counts hidden rows with notes; en/vi keys exist (spec 4, 6, 7).
2. `packages/database/src/outlet-operations.ts`: add `notes` to `orderRowSelect` and to `orderItems.select`.
3. `apps/api/app/api/analytics/outlet-operations/route.ts`: `toRow` adds `notes` and `items[].notes` (skill `api-route-standard`; route shape unchanged otherwise).
4. `packages/utils/src/api/analytics.ts`: optional `notes` on `OutletOperationsOrder` and its `items`.
5. `apps/client/app/dashboard/overview-model.ts`: `OpsOrderLike` gains optional `notes` / `items`; `TodayRow` gains `notes` / `itemNotes`; new `rowHasNotes`, `notedRowCount`.
6. `apps/client/app/dashboard/overview/sections.tsx`: note block in `TodayOrders` rows and "· K có ghi chú" on the more line (spec 5, 6).
7. `locales/{en,vi}/dashboard.json`: `home.orders.notesLabel`, `home.orders.moreNotes` (skill `i18n-keys`).
8. `.agent/api-changes/LOG.md`: row for #1527 (`planned`, then PR number) (skill `api-compat-review`).

## Verify

- `yarn --cwd tests test outlet-operations web-overview-model locales-valid-json` (also with `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`)
- `npx tsc --noEmit -p apps/client/tsconfig.json`, `npx tsc --noEmit -p apps/api/tsconfig.json`
- `yarn lint` on the touched apps
- UI check: shop web on a local API with seeded orders that have notes; Tổng quan at desktop and phone width, headed browser.

## Files

- `packages/database/src/outlet-operations.ts` — select the notes
- `apps/api/app/api/analytics/outlet-operations/route.ts` — return the notes
- `packages/utils/src/api/analytics.ts` — type
- `apps/client/app/dashboard/overview-model.ts` — row model
- `apps/client/app/dashboard/overview/sections.tsx` — UI
- `locales/en/dashboard.json`, `locales/vi/dashboard.json` — strings
- `.agent/api-changes/LOG.md` — tracking row
- tests above

## Risks

- Backward compatibility: additive keys only; old iOS / Android ignore them (issue #1527 table).
- Payload: note text for at most 50 rows per list.
- No migration, no production data change.

## Rollback

Revert the PR. Old clients never read the new keys, so nothing else needs to change.
