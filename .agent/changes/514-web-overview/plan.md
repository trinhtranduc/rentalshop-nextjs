# Plan — #514 Shop web Tổng quan

Issue: #514 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/client/app/dashboard/overview-model.ts`: pure functions with no React. They take `todayKey` and a weekday list, so tests need no browser or clock:
   - `periodRange`
   - `chartRange`
   - `formatDayLabel`
   - `buildKpis`
   - `buildTodayWork`
   - `buildTodayRows`
   - `chartBars`
2. `tests/web-overview-model.test.ts`, run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh` (`timezone-dates`).
3. `apps/client/app/dashboard/page.tsx`: replace with the new page. Split the sections into `apps/client/app/dashboard/overview/*.tsx` (KpiCards, CollectedChart, TodayWork, MoneyCards, TodayOrders, TopProducts). Reuse `useOutletOperations`.
4. Drop the old dashboard code once nothing imports it. `OutletOperationsPanel.tsx` stays for the hook.
5. `locales/{en,vi,ja,ko,zh}/dashboard.json`: add the `home` block (`i18n-keys`).
6. `loading.tsx`: a skeleton in `ar-*` colours.
7. Verify (`verify-change`):
   - lint, plus client and admin `tsc` against the `dev` baseline;
   - run the test file under both TZ values;
   - client `next build`;
   - Playwright screenshots with the API mocked: 1440 and 390, light and dark, and staff (today only, no money).

## Files

- `apps/client/app/dashboard/{page,loading,overview-model}.tsx|ts`, `apps/client/app/dashboard/overview/*`
- `locales/*/dashboard.json`
- `tests/web-overview-model.test.ts`

## Risks

- Losing something the old page showed. The old page's extras were stock counts, top customers, quick-add dialogs and the year chart. They are not on the approved board, and stock lives on Sản phẩm and Kiểm tra còn hàng.
- The outlet filter does not reach the period report. This is the same as before.

## Rollback

Revert the PR. The old page comes back as it was.
