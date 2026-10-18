# Auto-generate a product barcode

Issue: #994 · Author: agent · Status: in-progress · Created: 2026-10-15

## Problem

The phone product form (iOS and Android, the `newProducts` screen) opens with an empty barcode. The user has to type or scan one. A product saved without a code cannot be scanned or printed later. The web create form already fills a code and offers a button to make another.

## Proposed outcome

Opening "create product" on iOS and Android shows an 11-digit barcode (last 8 digits of the clock plus 3 random digits — the same rule as the web form). The user can edit it or tap regenerate before saving. Editing a product keeps the stored code. Web keeps the behavior it already has.

## Affected users and systems

Roles that can create products (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_INVENTORY`, `ADMIN`). Apps: iOS, Android, and the client web form (already done). No API or database change.

## Constraints

- Do not change the product create/update API. The apps still send the existing optional `barcode` field.
- An edit must not replace a barcode the shop already saved.
- The old phone form (shown only when `newProducts` is off) already fills 6 random digits. Leave it alone.
- Same 11-digit rule on web, iOS, and Android so a code looks the same whichever screen created it.

## Open questions

None. The owner asked to implement this outcome.

## Decision log

- 2026-10-15 — Generate on the client, before save, so the user sees the code and can regenerate it. A server-only code would appear only after save. (owner request)
- 2026-10-15 — Reuse the web rule (8 clock digits + 3 random digits) instead of the old phone rule (6 random digits). (agent)
- 2026-10-15 — The "new barcode" control is an icon on web, iOS, and Android. The words stay as the accessible name. (owner)
