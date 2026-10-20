# #1147 Pricing page shows real plans

**What:** `/pricing` and `/{locale}/pricing` show the plans, prices and limits from `/api/plans/public`, not the constants in `SUBSCRIPTION_PLANS`. Vietnamese titles stop repeating "| AnyRent".
**Why:** production shows 79.000/199.000/399.000 ₫ and wrong limits while the real plans are 99.000/179.000/contact; non-vi pages show VND amounts against #1121.
**Constraints:** no API change; keep `SUBSCRIPTION_PLANS` for other callers; no wrong numbers when the API fails.
