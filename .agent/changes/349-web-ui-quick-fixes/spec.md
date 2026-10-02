# Spec — Web UI quick fixes

Issue: #349 · Status: accepted · Intent: ./intent.md

## Behavior

1. Calendar cards show the sum of `ordersCountByDate` for the displayed month (`YYYY-MM-DD` keys, Map or Record); other months are excluded.
2. Order detail never renders a bare `0` when bail, material, and damage fee are empty or 0.
3. Note titles and additional-detail labels are translated; amounts use `formatCurrency`.
4. These keys exist in en and vi: `products.filters.loading`, `common.actions.selectAll`, `customers.actions.selectAll`,
   `users.labels.loading`, `settings.changePassword.description`. `common` keys also exist in ja/ko/zh.
5. Pagination shows a translated "items per page", "apply", and item name.
6. The Users page search placeholder, role filter, email status header, and badges are translated.

## Out of scope

Currency symbol across the app, default outlet, mobile table layout, dashboard hooks (separate issues).

## Acceptance

- [ ] 1 covered by `tests/packages/ui/calendar-month-totals.test.ts`
- [ ] 2–6 checked on localhost (Playwright audit: no MISSING_MESSAGE, screenshots)
