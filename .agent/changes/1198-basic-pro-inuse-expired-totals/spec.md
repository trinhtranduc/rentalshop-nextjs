# Spec — Basic / Pro in use, expired, totals

Issue: #1198 · Status: accepted · Intent: ./intent.md

## Behavior

1. Merchants tile chips: `Basic: {all}`, `Pro: {all}` → `/merchants?plan=Basic` and `?plan=Professional`.
2. In use tile chips: `Basic: {current}`, `Pro: {current}` → `?status=current&plan=…`.
3. Expired tile chips: `Basic: {expired}`, `Pro: {expired}` → `?status=expired&plan=…`.
4. Chip number = GET `/api/merchants` `data.total` for that query.
5. `plan=Basic` contains `basic`; `plan=Professional` contains `pro`.

## Out of scope

- Changing the Trial tile (enum TRIAL, including hết hạn).
- New API params.

## API and data

No new fields. Existing `plan=` and `status=expired` AND.

## Acceptance

- [ ] Tests: totals among all rows; in-use among còn hạn; expired among period ended; hrefs
- [ ] E2e cases for total and expired chips
- [ ] No new i18n keys
