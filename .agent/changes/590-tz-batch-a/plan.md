# Plan — Timezone batch A

1. Failing tests first (commit alone): unit `tests/packages/availability/availability-vn-day-windows.test.ts`
   (window resolver at 16:59:59Z / 17:00:00Z, month and year edges, every client's shape); business e2e
   `tests/e2e/business/availability-vn-days.e2e.test.js` replaying web, App Store iOS, current iOS, old and new
   Android request shapes on all three routes; flip the #575/#576 known cases in `date-roundtrip`.
2. `apps/api/lib/availability-calendar-days.ts`: recognise any-ms and multi-day UTC-day windows; return
   `fromYmd`/`toYmd` and VN-day `bounds` from `resolveAvailabilityQueryWindow`.
3. Routes: `products/availability` (civil bounds), `products/batch-availability` (lt/gte on bounds),
   `products/[id]/availability` (same bounds).
4. Verify: unit + e2e under TZ=UTC and TZ=Asia/Ho_Chi_Minh, full jest vs `origin/dev`, lint, type-check, API build.
5. PR into `dev`: compat table, before/after numbers, `Fixes #590`, `Fixes #575`, `Fixes #576`, `Part of #578`.
