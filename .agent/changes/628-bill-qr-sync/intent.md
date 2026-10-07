# QR chuyển khoản trên hoá đơn — one per-outlet setting, synced web ↔ mobile

Issue: #628 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-07

## Problem

#622 added "In QR chuyển khoản trên bill" as a **per-device** switch on mobile. The owner wants one setting
that the web and both mobile apps share, that shows in the web Phiếu in preview, and that prints on the
web bill: "hình preview cho phép có qr code hay không, và lúc in có thấy không? ở print cần có cấu hình
này, mobile load về cũng đồng bộ".

## Proposed outcome

- `Outlet.printBankQr` (boolean, default `false`) is stored on the server and returned wherever an outlet's
  `printNote` is already returned (order detail outlet, outlet list / update) and on the login / profile outlet.
- `PUT /api/outlets?id=` accepts an optional `printBankQr` (MERCHANT of that merchant, OUTLET_ADMIN of that outlet).
- Web Cài đặt → Phiếu in → Hoá đơn has a switch "Hiện QR chuyển khoản trên hoá đơn" per outlet; the sample
  bill shows the outlet's default bank account (bank, STK, holder) and its VietQR when on, nothing when off,
  and a hint with a link to the bank accounts when on but the outlet has none.
- The web order Hoá đơn (screen and print) shows the same block when the order's outlet has `printBankQr`
  and a default active account. A failed account load hides the block, never an error.
- The QR payload equals `generateVietQRString(account)` (no amount).

## Affected users and systems

MERCHANT, OUTLET_ADMIN (edit), OUTLET_STAFF (read only, prints). `apps/api`, `packages/database`,
`packages/utils` (zod), `packages/types`, `prisma`, `apps/client`. iOS and Android follow on the same branch.

## Constraints

- Additive API only; installed apps on `main-real` must ignore the new key.
- Additive migration (`BOOLEAN NOT NULL DEFAULT false`); existing bills stay unchanged.
- The slip is black on white and prints at 80 mm or 58 mm.

## Open questions

- None blocking. Mobile parity (switch reads/writes the server field) is the next step on this branch.

## Decision log

- 2026-10-07 — The per-device switch of #622 is replaced by a per-outlet server field `Outlet.printBankQr`,
  synced web ↔ mobile (owner).
- 2026-10-07 — API + migration + web first; mobile on the same branch before the PR (owner via coordinator).
