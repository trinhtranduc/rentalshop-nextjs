# Plan — #884

1. Tests first: `tests/api/users-list-filters.test.ts` (route: ADMIN filters by merchantId / outletId, MERCHANT
   cannot widen its scope) and `tests/admin-users-filter.test.ts` (URL helpers + the page/filter wiring). Run: helper tests red.
2. `apps/admin/app/users/users-filter-url.ts` helpers.
3. `UserFilters` + `Users`: opt-in merchant / outlet selects.
4. `apps/admin/app/users/page.tsx`: read helpers, pass `merchantId` / `outletId` into `useUsersData`, handle changes.
5. Verify: tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`, admin tsc, eslint on changed files, headed Chrome on a
   local API + own DB at 390px and 1280px (screenshots in /private/tmp/claude-billing/shots884/).
