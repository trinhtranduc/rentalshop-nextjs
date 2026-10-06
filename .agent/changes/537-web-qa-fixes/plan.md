# Plan — #537

1. `apps/client/app/users/users-model.ts`: `staffQuery`; `page.tsx`: `searchStaff` via `authenticatedFetch`.
2. `apps/client/app/products/page.tsx`: mask on the chip strip.
3. `apps/client/app/customers/list/parts.tsx` + `locales/{vi,en}/customers.json`: `orderCount`.
4. Tests in `tests/web-settings-model.test.ts` (users model lives there).
5. Verify: client tsc, eslint on the changed files, jest in both TZ, build, screenshots of the three screens.
