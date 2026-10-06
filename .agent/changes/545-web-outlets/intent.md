# Intent — #545 Shop web Chi nhánh on the new shell

Issue: #545 · Status: accepted (owner: "redraw every page still on the old UI, following the design system; many issues, many PRs") · Created: 2026-10-06

## Problem

`/outlets` is titled "Cửa hàng" (the nav says "Chi nhánh") with the title repeated as subtitle, uses the old
PageWrapper and shared Outlets table, and in dark mode keeps white cards and near-invisible titles.
`/outlets/[id]/bank-accounts` uses the old header, a breadcrumb that links to `/outlets/{id}` (no such page),
and the shared list with English "Status" / "Actions" / "Active".

## Proposed outcome

Both pages use the shell tokens and the Nhân viên table style, work in light / dark and at 390px, and keep
every action: search, sort, paging, view, add, edit (with the receipt note), pause / reopen (not the default
outlet), and per-outlet bank accounts (list, add, edit, delete, copy number).

## Affected users and systems

MERCHANT (nav shows Chi nhánh only to the owner). OUTLET_ADMIN / OUTLET_STAFF can still open the URL as
before; the API scopes the list. Bank accounts: `bankAccounts.view` / `bankAccounts.manage` as before.
`apps/client` only.

## Constraints

- UI only: `useOutletsWithFilters` (GET /api/outlets), `outletsApi.createOutlet / updateOutlet`,
  `bankAccountsApi.*`. The bank page also reads GET /api/outlets once for the outlet name. No API change →
  no mobile parity / API-compat work.
- `packages/**` untouched; the shared BankAccountForm stays in the shared dialog.
- New strings in `locales/{en,vi}/outlets.json` → `web` (ja/ko/zh have no outlets.json).

## Open questions

- none

## Decision log

- 2026-10-06 — toasts say "chi nhánh" (new `web.toast.*`) instead of the old "cửa hàng" messages (agent).
- 2026-10-06 — the disable confirm says "Tạm ngưng chi nhánh" (it sets `isActive: false`); the old one said
  "Xóa cửa hàng", which it never did (agent).
- 2026-10-06 — the nav label already says "Chi nhánh" (`components/shell/nav.ts`), so no shell change is needed (agent).
- 2026-10-06 — the list calls `outletsApi.searchOutlets(filters)` (same GET /api/outlets): the old
  `useOutletsWithFilters` called `getOutlets()` without the filters, so search / sort / paging never reached the API (agent).
