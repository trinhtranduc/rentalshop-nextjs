# Intent — #943 attendance as a feature add-on

**What:** sell the attendance module (Chấm công) as a priced add-on row of type "Tính năng" in the existing add-on
system (#850/#870), instead of the free "Module" switch of #907.

**Why:** owner (2026-10-13): the module must be paid, charged mid-period like other add-ons, renewed with the plan,
and turned off from the next period without refund.

**Constraints:** payments (human review), additive migration only, `merchant.modules` and `MODULE_NOT_ENABLED` keep their
meaning (only the source changes), legacy `MerchantModule` rows keep working, Vietnam days, admin only (OPS reads).
Mockup: artifact MikH31P6eVqyzbnj6BoWzf, tab "Admin AnyRent (add-on)".
