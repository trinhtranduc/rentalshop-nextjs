# Plan — #556 Shop web Tạo đơn: pricing per cart line, overlap tags, no category chips

Issue: #556 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/client/app/orders/create/schedule-model.ts` (new, no `@rentalshop/*` imports): day keys, instant → VN day,
   per-line conflict (port of iOS `ScheduleConflictLogic`), conflict from a batch result, day-range / order-list text,
   CTA state, setting reader. Tests `tests/web-orders-schedule-model.test.ts` port the iOS `ScheduleConflictTests`.
2. `create-model.ts`: `customPrices` on `CartLine`, `selectMode`, `setLinePrice`, `lineModes`, `needsPrice`,
   `repriceLines` keeps manual rent prices, `firstMissing` gains `price`. Tests in `tests/web-create-order-model.test.ts`.
3. `OrderEditor.tsx`: drop categories; availability keeps raw results (stale answers dropped, refresh nonce);
   overlap setting from the profile; conflict list; confirm modal; blocked notice; 409 handling.
4. `parts.tsx`: `CartLineRow` pricing chip + inline editor, availability / conflict tag.
5. Range calendar: `calendar-model.ts` (new, pure: month grid Monday-first, pick / mark a range on day keys,
   tests `tests/web-orders-calendar-model.test.ts`); `parts.tsx` `DaysDialog` draws `RangeCalendar` in a wide `Modal`.
6. `locales/{en,vi}/orders.json` under `web.editor` (skill `i18n-keys`).
7. Verify: tsc on apps/client, eslint on touched paths, Jest under both TZ, browser at 1440/390 light/dark
   with conflict + fits tags, mode switch and price edit, ON confirm, OFF stubbed with Playwright, sale, Sửa đơn.

## Files

- `apps/client/app/orders/create/{schedule-model.ts,calendar-model.ts,create-model.ts,OrderEditor.tsx,parts.tsx}`
- `tests/web-orders-calendar-model.test.ts`
- `locales/{en,vi}/orders.json`
- `tests/web-orders-schedule-model.test.ts`, `tests/web-create-order-model.test.ts`

## Risks

- Payload: `pricingOptionId` must stay absent when the type has no option. Covered by tests.
- No API change, so no installed-app risk.

## Rollback

Revert the PR; the screen returns to the #523 behaviour.
