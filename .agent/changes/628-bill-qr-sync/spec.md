# Spec — QR chuyển khoản trên hoá đơn (per outlet)

Issue: #628 · Status: accepted · Intent: ./intent.md

## Behavior

1. A new outlet and every existing outlet has `printBankQr = false`.
2. `PUT /api/outlets?id=<outlet>` with `{ "printBankQr": true|false }` stores it and returns the outlet with the
   new value. A body without the key leaves it unchanged. A non-boolean is a 400 validation error.
   Role rules are the existing PUT rules (MERCHANT own merchant, OUTLET_ADMIN own outlet, staff 403).
3. `GET /api/outlets` items, `GET /api/orders/[id]` `data.outlet`, `GET /api/orders/by-number` `data.outlet`,
   login `data.user.outlet` and `GET /api/users/profile` `data.outlet` carry `printBankQr`.
4. Web Phiếu in: a switch per outlet in the Hoá đơn card. MERCHANT / OUTLET_ADMIN toggle it; it saves at once
   with a toast and rolls back on failure. Other roles see it disabled.
5. Web Phiếu in preview: when the preview outlet's switch is on and it has a default active account
   (else the first active account is **not** used: none), the sample bill shows the bank block + QR before the
   thank-you footer. On + no default account → hint "Chi nhánh chưa có tài khoản ngân hàng" with a link to the
   bank accounts (OUTLET_ADMIN: Cài đặt tab; MERCHANT: `/outlets/<id>/bank-accounts`). Off → no block.
6. Web order Hoá đơn (RENT and SALE): same block when `order.outlet.printBankQr` is true and the order outlet
   has a default active account. A load failure shows no block and no error.
7. The QR is VietQR without amount, equal to `generateVietQRString({ bankName, bankCode, accountNumber,
   accountHolderName })`; an account the generator rejects shows the text lines without a QR.
8. QR size: ~32 mm on 80 mm paper, ~28 mm on 58 mm paper, centered, black on white, prints.

## Out of scope

- iOS / Android (next step on this branch). Admin app receipt (`packages/ui` `ReceiptPreviewModal`).
- An amount in the QR, per-order transfer content.

## API and data

- `Outlet.printBankQr Boolean @default(false)` (migration `outlet_print_bank_qr`).
- `outletCreateSchema` / `outletUpdateSchema`: `printBankQr: z.boolean().optional()`.
- Order outlet selects (`findByNumber`, `findByIdDetail`) add `printBankQr`; user `findById` outlet select adds it;
  login and profile outlet objects add it. Numeric ids only. Scope unchanged.

## Acceptance

- [x] Each behavior line has a test, a command, or a UI check named in `plan.md`
- [x] iOS and Android called out (next step; JSON paths in plan)
- [x] New user-facing strings listed for all five locales (settings.web.printer.*)
- [x] Role limits hold (PUT role checks unchanged; staff switch disabled)
