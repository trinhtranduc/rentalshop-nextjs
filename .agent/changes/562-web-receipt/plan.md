# Plan — #562 Xem trước hóa đơn redone on the shop web

Issue: #562 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/client/app/orders/receipt/receipt-model.ts` — pure: money, VN day / time, shop fields, info rows,
   item calc text, totals, print note. No `@rentalshop/*` import.
2. `tests/web-receipt-model.test.ts` — spec 3–4 under both TZ.
3. `apps/client/app/orders/receipt/ReceiptSlip.tsx` — the slip (self-contained CSS so screen = print).
4. `apps/client/app/orders/receipt/ReceiptDialog.tsx` — dialog shell, print CSS, outlet details fetch;
   exports `ReceiptPreviewModal` with the old props so call sites change only their import.
5. Call sites: `create/OrderEditor.tsx` (one import line), `[id]/page.tsx` (import).
6. `locales/{en,vi}/orders.json` — `web.receipt.*`.
7. Verify: tsc apps/client, eslint touched paths, Jest both TZ, browser on :3294.

Domain skills: `timezone-dates`, `i18n-keys`. Not applicable: `api-route-standard`, `db-migration`,
`mobile-parity`, `api-compat-review` (no API change).

## Files

- `apps/client/app/orders/receipt/receipt-model.ts` — new
- `apps/client/app/orders/receipt/ReceiptSlip.tsx` — new
- `apps/client/app/orders/receipt/ReceiptDialog.tsx` — new
- `apps/client/app/orders/create/OrderEditor.tsx`, `apps/client/app/orders/[id]/page.tsx` — imports
- `locales/en/orders.json`, `locales/vi/orders.json` — strings
- `tests/web-receipt-model.test.ts` — tests

## Risks

- PR #558 / #560 touch the same call-site files; edits kept to import lines.
- Print CSS hides `<body>` children while the dialog is open; removed on close.

## Rollback

Revert the PR; both call sites return to the shared modal.
