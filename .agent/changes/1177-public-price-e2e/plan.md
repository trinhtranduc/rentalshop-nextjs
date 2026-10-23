# Plan — E2e Hiện giá trên trang shop

Issue: #1177 · Status: implemented · Spec: ./spec.md

## Steps

1. Add “Trang shop công khai” to WEB-UI-SET-01 tabs.
2. Add WEB-UI-SET-11: toggle, capture PUT, guest visit `/{tenantKey}/products`, restore.
3. Catalogue row in `tests/e2e/TEST_CASES.md`.
4. Verify: headed `scripts/e2e/web-e2e.sh --ui settings` with `WEB_E2E_CASES=WEB-UI-SET-11` (10/10 on 2026-10-23).

## Files

- `tests/e2e/web/ui-settings.web.js` — SET-01 tab + SET-11
- `tests/e2e/TEST_CASES.md` — SET-01..11
- `.agent/changes/1177-public-price-e2e/` — intent/spec/plan

## Risks

None for production: tests only. The case mutates `showPublicPrice` and restores it.

## Rollback

Revert the PR. Settings e2e goes back to SET-01..10.
