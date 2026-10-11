# #824 — outlet rules (part of #823)

**Why.** The owner wants one person, the shop owner (MERCHANT), to decide how many branches a shop runs.
Today an OUTLET_ADMIN can create, pause or delete outlets, `POST /api/merchants/[id]/outlets` skips the plan
limit, re-enabling skips it too, and a new outlet has no stock rows, so its products look missing.

**Outcome (owner decisions in #823, 2026-10-11).**
- Only MERCHANT (and platform ADMIN) create, disable or delete an outlet. OUTLET_ADMIN edits the info of its own
  outlet only (name, address, phone, print settings, bank accounts).
- Disable / delete is refused while the outlet has RESERVED or PICKUPED orders (count in the answer). Stock alone
  does not block.
- Users of a disabled outlet cannot log in, and their open sessions stop on the next request.
- Plan limit for outlets: missing or 0 = 1 outlet, -1 = unlimited. Every create and re-enable checks it. Outlets
  already above the limit stay.
- A new outlet gets a 0-stock row for every non-deleted product; a one-time migration backfills existing outlets.
- Shop web: "Thêm chi nhánh" only for MERCHANT; "Sửa" in the detail dialog follows the row permission (#736).

**Constraints.** Reuse FORBIDDEN / PLAN_LIMIT_EXCEEDED; add only OUTLET_HAS_OPEN_ORDERS and OUTLET_DEACTIVATED.
No schema change; the backfill is data-only and idempotent. Installed iOS/Android builds: none with users (owner).
