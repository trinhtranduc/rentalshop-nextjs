# Plan — Timezone batch D (#589)

1. Commit the failing tests alone. Jest: `tests/web-shop-today.test.ts` (next-midnight helper, renewal days,
   Sửa đơn payload keeps the instants). Web e2e: a clock roll-over check (WEB-RT-05), and the #579 known
   entry removed.
2. Set `FIX_MODE=1`. Add `apps/client/app/hooks/shop-today.ts` (pure) and `useShopToday.ts`, then swap the ten `useMemo`s.
3. `create-model.ts` `buildPayload` takes the original instants. `OrderEditor` passes them in edit mode.
4. `components/renewal-model.ts` counts civil days, and the renewal bar uses it.
5. `availability/page.tsx` keeps the deep-linked id in the URL until the product loads, so the load is no longer cancelled.
6. Verify: Jest under both TZ, the full suite compared with dev, lint and type-check of the client,
   and `scripts/e2e/web-e2e.sh` in three zones.

Rollback: revert the PR (web only).
