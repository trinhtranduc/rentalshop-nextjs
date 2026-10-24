# Plan — #1180

Skills: `bug-fix-tdd`, `api-compat-review`, `api-route-standard`, `implement-issue`.

1. Failing tests for `applySubscriptionListWhere` in `tests/subscription-list-where.test.ts`.
2. Helper `packages/database/src/subscription-list-where.ts`; use it in `searchSubscriptions` and `simplifiedSubscriptions.search`.
3. `GET /api/subscriptions` reads optional `bucket`. Utils + hook pass it. Types add `bucket?: 'expiring' | 'expired'`.
4. Admin subscriptions page reads URL `status` / `bucket`; dropdown; dashboard tile hrefs.
5. `apps/admin/app/details.css`: checkbox/radio min-width 1rem.
6. `.agent/api-changes/LOG.md` planned row.
7. Verify: `cd tests && yarn test subscription-list-where`; type-check admin if possible.

## Verify

- `cd tests && yarn test subscription-list-where`
- Dashboard tile click → list filtered
- `/merchants/:id/products` checkboxes visible
