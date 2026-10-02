# Plan — Per-outlet print note on web RENT receipts

Issue: #347 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests: `tests/packages/utils/outlet-print-note-schema.test.ts` (1, 3) and
   `tests/packages/ui/receipt-print-note.test.tsx` (6, 7) rendering the receipt content with `react-dom/server`.
2. Migration `prisma/migrations/20261002130000_outlet_print_note/` + `schema.prisma` (`db-migration`).
3. `packages/utils/src/core/validation-schemas.ts`: `printNote` on create/update (empty → null).
4. `apps/api/app/api/outlets/route.ts`: POST explicit field list (`api-route-standard`).
5. `packages/types`: `Outlet`, `OutletCreateInput`, `OutletUpdateInput`, `OutletReference`.
6. `packages/database/src/order.ts`: `printNote: true` in `findByNumber` and `findByIdDetail` outlet selects.
7. `apps/client/app/outlets/page.tsx`: form state, prefill, update payload, Textarea.
8. `apps/client/app/orders/create/page.tsx`: keep `printNote` in the outlets mapping.
9. `ReceiptPreviewModal.tsx`: RENT footer, inline `white-space: pre-wrap` (print iframe has no Tailwind).
10. i18n (`i18n-keys`): `outlets.fields.printNote`, `outlets.placeholders.enterPrintNote`, hint text, en + vi.

## Verify

- `cd tests && yarn test outlet-print-note receipt-print-note`
- Build api + client; local stack: edit note on /outlets, open a RENT order, print preview screenshot; SALE order has none.

## Risks

- Migration on Railway (human). Receipt layout for long notes (500 chars).

## Rollback

Revert the PR; the nullable column can stay.
