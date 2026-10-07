# Plan — QR chuyển khoản trên hoá đơn (per outlet)

Issue: #628 · Status: accepted · Spec: ./spec.md

## Steps

1. `db-migration`: add `printBankQr Boolean @default(false)` to `Outlet`; create
   `prisma/migrations/<ts>_outlet_print_bank_qr` with `--create-only` against the local e2e DB, apply it there.
2. `api-route-standard` / `api-compat-review`: zod (`packages/utils/src/core/validation-schemas.ts`), POST/PUT
   `apps/api/app/api/outlets/route.ts`, order outlet selects (`packages/database/src/order.ts`), user
   `findById` outlet select (`packages/database/src/user.ts`), login (`apps/api/lib/build-auth-login-response.ts`),
   profile (`apps/api/app/api/users/profile/route.ts`), types (`packages/types`). Row in `.agent/api-changes/LOG.md`.
3. Pure model `apps/client/app/orders/receipt/bank-qr-model.ts`: pick the default active account, decide the
   block, build the QR string (same algorithm as `generateVietQRString`). Jest `tests/web-bill-bank-qr.test.ts`
   under TZ=UTC and TZ=Asia/Ho_Chi_Minh, cross-checked against `packages/utils/src/core/bank-qr.ts`.
4. Slip block (`ReceiptSlip.tsx`, `qrcode.react` `QRCodeSVG`) + loader hook (`useOutletBankQr`) used by
   `ReceiptDialog.tsx` and `PrintPreviews.tsx`; switch + hint in `settings/sections.tsx` `ReceiptSection`.
5. `i18n-keys`: `settings.web.printer.bankQr*` in en/vi/ja/ko/zh; `orders.web.receipt.bank*` likewise;
   `bankAccounts.messages.noPermission` (en, vi — the only locales with that file).
6. Verify: jest `web-` both TZ, tsc client + api, `next lint --file`, second local API :3281 + web :3291,
   screenshots, QR decoded with macOS Vision.

## Files

- `prisma/schema.prisma`, `prisma/migrations/<ts>_outlet_print_bank_qr/` — column
- `packages/utils/src/core/validation-schemas.ts` — accept `printBankQr`
- `apps/api/app/api/outlets/route.ts` — POST passes it; PUT already passes parsed data
- `packages/database/src/order.ts`, `packages/database/src/user.ts` — selects
- `apps/api/lib/build-auth-login-response.ts`, `apps/api/app/api/users/profile/route.ts` — outlet objects
- `packages/types/src/entities/outlet.ts`, `packages/types/src/common/base.ts` — types
- `apps/client/app/orders/receipt/*`, `apps/client/app/settings/*` — UI
- `locales/*` — strings

## Mobile (next step, same branch)

Read `printBankQr` from: `GET /api/orders/{id}` → `data.outlet.printBankQr`; `GET /api/outlets` →
`data.outlets[].printBankQr`; login → `data.user.outlet.printBankQr`; `GET /api/users/profile` →
`data.outlet.printBankQr`. Write: `PUT /api/outlets?id={outletId}` body `{ "printBankQr": bool }`.

## Risks

- Migration is additive with a default: no lock concern beyond a metadata-only ALTER on Postgres 11+.
- Old apps ignore the new key (iOS `Outlet.swift:13` Codable; Android `ApiClient.kt:1019,1193` reads by name).

## Rollback

Revert the PR; the column can stay (default false, unused). A later migration may drop it.
