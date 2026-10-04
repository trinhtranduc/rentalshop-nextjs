# Mobile products, product form, rent and sale cart

Issue: #373 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The Home tab of both apps is a product list whose rows hide the per-day and sale prices and have no image-led
layout. There is no product detail: staff cannot see a product's prices, how many units are out, or its orders in one
place. The product form is one long list that does not follow the role rule (`OUTLET_STAFF` has no `products.update`
and no price rights) visibly, and the "stock lower than rented" error from the API reads as a generic failure.
The cart mixes rent and sale fields and does not show per line whether it is priced per rental or per day.

## Proposed outcome

With the `newProducts` app-config flag on, both apps show the canvas design (artifact DY4DRyDH8Kps9gAw9FExLx,
boards SP-dong, SP-chi-tiet, SP-tao, SP-sua, Gio-hang, Gio-hang-ban): a product list with images, a product detail,
an add/edit form with role rules, and one cart with a Thuê / Bán switch. With the flag off nothing changes.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. Reads `GET /api/products`, `GET /api/products/:id`,
`GET /api/categories`, `GET /api/orders?productId=`, batch availability; writes `POST/PUT /api/products` and creates
orders through the existing order preview. No API change.

## Constraints

- Installed apps and users without the flag keep the current screens.
- Reuse the existing cart stores, create-order and payment flow; no new business rule.
- `OUTLET_STAFF`: no price fields, no edit (the API also rejects or strips it).
- Days in the device time zone; rental days stay inclusive.
- Delete product waits for the API soft-delete change (#362 PR 1b).

## Open questions

- None.

## Decision log

- 2026-10-04 — Plan approved as part of #363 phase 3 (Trinh Tran)
- 2026-10-04 — Cart CTA opens the existing order preview, which creates the order and collects payment (reuse, no new flow)
