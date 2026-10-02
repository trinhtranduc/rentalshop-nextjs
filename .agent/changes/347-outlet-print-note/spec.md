# Spec — Per-outlet print note on web RENT receipts

Issue: #347 · Status: accepted · Intent: ./intent.md

## Behavior

1. `outletUpdateSchema` and `outletCreateSchema` accept `printNote` (string, ≤ 500 chars, may be empty); longer is a validation error.
2. `PUT /api/outlets?outletId=` saves `printNote`; `POST /api/outlets` saves it on create; `GET /api/outlets` returns it.
3. Empty `printNote` is stored as `null` (clears the note).
4. Order detail data used by the web receipt (`findByNumber`, `findByIdDetail`) includes `outlet.printNote`.
5. The web outlet edit dialog shows a multi-line "Ghi chú in hóa đơn" field, prefilled, saved with the outlet.
6. The web receipt prints the outlet's `printNote` in the RENT footer, keeping line breaks.
7. SALE receipts never print it. A RENT receipt with no note prints nothing extra.
8. The note printed after creating an order on the web comes from the selected outlet.

## Out of scope

- Mobile apps reading the server note. Settings tab for OUTLET_ADMIN (`/api/settings/outlet`). Admin app.

## API and data

- `Outlet.printNote String?` (migration). Outlet responses gain `printNote` (additive; mobile decoders ignore unknown keys).

## Acceptance

- [ ] 1, 3, 6, 7 covered by Jest tests
- [ ] 2, 4, 5, 8 checked on the local stack (API + client) with a printed receipt screenshot
