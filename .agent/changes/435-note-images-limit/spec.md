# Spec — Five photos per order note

Issue: #435 · Status: in progress · Intent: ./intent.md

## Behavior

1. `VALIDATION.MAX_ORDER_NOTE_IMAGES` is 5 and is the API limit for each of `notesImages`,
   `pickupNotesImages`, `returnNotesImages`, `damageNotesImages`.
2. `POST /api/orders` (JSON or multipart) with more than 5 photos in one field → 400
   `IMAGE_VALIDATION_FAILED`, nothing created, nothing uploaded.
3. `PUT /api/orders/:id` JSON with more than 5 URLs in one field → 400, nothing written.
4. `PUT /api/orders/:id` multipart: saved photos + new files over 5 in one field → 400 before upload.
5. Requests with 3 photos (installed apps) and with 5 photos succeed as before.
6. Web, iOS and Android let staff add up to 5 photos per field and compress each to ~180KB before upload.

## Out of scope

- Changing the server compression target (200KB) or the error text.
- Product images.

## API and data

No new fields. A new 400 on requests with more than 5 photos per field, reusing
`IMAGE_VALIDATION_FAILED` (already in `errors.json` and the iOS/Android error tables).

## Acceptance

- [x] Behaviors 1–5 covered by `tests/api/order-note-images-limit.test.ts` and
      `tests/api/order-create-merchant-default-outlet.test.ts`
- [x] iOS and Android limits changed together
- [x] No new user-facing strings
- [ ] Behavior 6 checked by hand on web, iOS and Android against dev-api
