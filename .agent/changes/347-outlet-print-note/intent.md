# Per-outlet print note on web RENT receipts

Issue: #347 · Author: Trinh Tran · Status: accepted · Created: 2026-10-02

## Problem

Mobile prints a "printer note" at the bottom of RENT receipts (default `*** Vui lòng mang theo CMND/BLX khi lấy đồ`),
stored only on each phone. The web receipt has no such note, and a shop cannot share one note across devices.

## Proposed outcome

- `Outlet.printNote` stored on the server, edited on the web outlet edit dialog.
- The web receipt prints it at the bottom of RENT receipts only (after the order note, before signatures).
- Outlet APIs return the field so mobile can adopt it later.

## Affected users and systems

- Roles: `MERCHANT`, `OUTLET_ADMIN` edit (`outlet.manage`); everyone printing sees it.
- Apps: `api`, `client`, `packages/ui`. Model: `Outlet`.

## Constraints

- Nullable column, new migration. Sale receipts unchanged. Labels in en + vi (zh/ko/ja load English for `outlets`/`orders`).

## Open questions

- Mobile reading the server note: follow-up issue (keeps the local note until then).

## Decision log

- 2026-10-02 — Store per outlet on the server (Trinh Tran)
- 2026-10-02 — Print on RENT receipts only, like mobile (Trinh Tran)
- 2026-10-02 — Max 500 characters, multi-line allowed; empty string clears it (agent)
- 2026-10-02 — Out of scope, reported separately: `PUT /api/settings/outlet` accepts `outlet.view`, so OUTLET_STAFF can edit outlet info (agent)
