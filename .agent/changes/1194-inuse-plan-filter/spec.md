# Spec — In-use plan chips filter the merchant list

Issue: #1194 · Status: accepted · Intent: ./intent.md

## Behavior

1. **In use** chips Basic / Pro / Enterprise count `GET /api/merchants?status=current&plan=Basic|Professional|Enterprise` and open those URLs.
2. Clicking In use opens `/merchants?status=current`. Clicking a chip does not navigate as In-use-all.
3. Metric tiles and chips render as `Link href=…` (not `router.push` only).
4. **Merchants** has no plan chips; number stays unfiltered `total`.
5. List at those URLs: status dropdown = In use, plan dropdown = that plan, every visible row still in period and on that plan.

## Out of scope

- Changing GET `/api/merchants` filter meaning.
- All-shop plan totals on the Merchants tile.
- Mobile POS.

## API and data

No change. `status=current` + `plan=` already AND in `resolveMerchantListFilters`.

## Acceptance

- [ ] Tests: hrefs contain `status=current&plan=`; `totalOf('current', 'Basic')`; no `title="Active"`
- [ ] Headed e2e: Basic chip URL, list request has both params, rows match còn hạn + plan
- [ ] Tiles use `href=` / `Link`
- [ ] No new i18n keys
