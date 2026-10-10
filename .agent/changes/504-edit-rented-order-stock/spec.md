# Spec — #504

1. `PUT /api/orders/{id}` on a RENT order that is PICKUPED and stays PICKUPED: `renting` follows (new lines - old lines) per product at the order's outlet, `available = max(0, stock - renting)` (same formula as the hand-over). A removed line gives units back, an added line takes them, a swapped product moves them, an increase beyond stock is accepted exactly like the same quantity at hand-over (renting may exceed stock, available stops at 0).
2. Same PUT that changes `outletId` of a PICKUPED RENT order: the old outlet gives the old lines back, the new outlet takes the saved lines.
3. A PUT that also changes the status: leaving PICKUPED/COMPLETED gives back the old lines at the old outlet (what was taken); entering a state that takes stock (RESERVED -> PICKUPED) takes the lines and outlet this PUT saves (was: the lines before the PUT).
4. RESERVED edits move no stock. A PUT without `orderItems`, or with equal quantities, moves nothing.
5. Response shape and status codes unchanged.
