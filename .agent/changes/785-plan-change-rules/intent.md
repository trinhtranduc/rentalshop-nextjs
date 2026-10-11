# 785 — Plan change only in a new period; record the payment of an upgrade and of an extension

Issue: #785. Follow-up to #779 (price and dates). Owner decisions, 2026-10-11:
- No downgrade in the middle of a period; a plan is changed only in a new period.
- A merchant cannot change plan in the middle of a period.
- Admin: in the middle of a period only an upgrade (credit for unused days, #779); a downgrade only in a new period.
- "New period" = the subscription has ended (expired), or it is a trial being turned into a paid plan.

Also fixed here (found by the review): an upgrade and an extension leave no `Payment`; extend rewrites the cycle from the number of days; a trial turned paid stays `TRIAL` in the database.

Constraints: additive API answers, installed iOS / Android do not call these routes (checked on main-real in #779), the merchant renew / upgrade UI is off behind `SUBSCRIPTION_UPGRADE_EXTEND_ENABLED`. Store UTC, Vietnam civil days. PR text in Vietnamese. Add-ons and modules (#782) are paused.

Status: accepted (owner gave the rules above and asked to implement).
