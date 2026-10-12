# #851 — Merchant status change moves an order to the default branch

**Want:** an order stays at its branch when the shop owner changes its status (or edits it) without sending `outletId`.
**Why:** a MERCHANT user carries the default outlet (`registration.ts:261`). `PUT /api/orders/:id` and `PUT /api/orders?id=`
filled `outletId` from that, so an order at branch B moved to the default branch and stock was taken there. Same code on `main-real`.
**Constraint:** installed apps send only `{status}` (Android `ApiClient.kt:413-421` on main-real). No response change.
