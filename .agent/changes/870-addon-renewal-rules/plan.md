# Plan — #870

1. Failing tests, committed first: unit `tests/packages/utils/addon-pricing.test.ts` (pack size in lines,
   `paidMonthlyTotal`, extension + plan-change add-on parts), route tests (renew pack size, extend, addon-price PUT,
   change-plan guard), e2e BF-ADD-15..18 + BF-ADD-03 update, `tests/e2e/TEST_CASES.md`.
2. utils: `addonRenewalLines` (packSize, paid total), `calculateExtensionTotal` / `calculatePlanChangeTotal` add-on params.
3. migration `nextPacks`; database: `addPacks` / `setNextPacks`, `applyRenewal` pack size; `changePlan` add-ons + guard; error code + 5 locales.
4. API: PATCH packs, extend, extend/calculate, addon-prices PUT, merchants addons GET field.
5. Admin: edit dialog line, change-plan dialog preview totals.
6. LOG row. Verify (both TZ), business e2e, headed admin check.
7. PR into dev (Vietnamese, `Fixes #870`, human review for billing).
