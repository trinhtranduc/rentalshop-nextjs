# Plan — #559 Shared date-range calendar

Issue: #559 · Status: accepted · Spec: ./spec.md

## Steps

1. Move `orders/create/calendar-model.ts` → `components/date-range/range-model.ts`, add `rangeDays`, `dayAllowed`,
   `rangeProblem`. Move the test to `tests/web-date-range-model.test.ts` and extend it.
2. `components/date-range/RangeCalendar.tsx`: `RangeCalendar` (from `parts.tsx`, plus min/max) and `DateRangeField`.
3. Tạo đơn `parts.tsx` imports the shared `RangeCalendar` (its own hints passed in, same text).
4. Tổng quan, Kiểm tra còn hàng, Đơn hàng use `DateRangeField`.
5. `locales/{en,vi}/common.json` `dateRange` keys.
6. Verify: tsc, eslint, Jest under both TZ, browser light/dark 1440/390, API params logged.

## Files

- `apps/client/app/components/date-range/{range-model.ts,RangeCalendar.tsx}`
- `apps/client/app/orders/create/parts.tsx` (`calendar-model.ts` removed)
- `apps/client/app/{dashboard,availability,orders}/page.tsx`
- `locales/{en,vi}/common.json`
- `tests/web-date-range-model.test.ts`

## Risks

- Popover clipped by a card with `overflow-hidden` (orders list card): check visually; the phone sheet is `fixed`.
