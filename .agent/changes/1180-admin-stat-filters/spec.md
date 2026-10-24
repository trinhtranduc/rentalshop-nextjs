# Spec — #1180 admin subscription tiles and merchant product checkboxes

## Behaviors

1. `GET /api/subscriptions?status=TRIAL` (case-insensitive known enum) returns only rows whose DB `status` is `TRIAL`. Same for `ACTIVE`, `CANCELLED`, `PAUSED`, `PAST_DUE`, `EXPIRED`.
2. `GET /api/subscriptions?bucket=expiring` returns rows whose `currentPeriodEnd` is after now and at most 7 × 24 hours from now. Does not require `status=ACTIVE`.
3. `GET /api/subscriptions?bucket=expired` returns rows whose `currentPeriodEnd` is before now.
4. Omitting `status` and `bucket` returns the same unfiltered (aside from merchant/plan/search) list as today.
5. Unknown `status` or `bucket` is ignored (not a Prisma enum throw).
6. Admin dashboard Trial tile navigates to `/subscriptions?status=TRIAL`; Active → `ACTIVE`; Cancelled → `CANCELLED`; Expiring Soon → `bucket=expiring`; Expired → `bucket=expired`.
7. Admin `/subscriptions` reads `status` and `bucket` from the URL, sends them on the search request, and shows a matching filter control.
8. Merchant product list (`/merchants/[id]/products`) row and header checkboxes are visible (at least 16×16 px) on desktop.

## Out of scope

- Changing dashboard tile *counts* (still computed client-side from the first 1000 rows).
- Mobile ProductTable checkboxes (the `md:hidden` card list never had them).
- Installed POS apps (they do not call the admin list).
