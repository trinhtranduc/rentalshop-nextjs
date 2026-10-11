# 779 — Renew, extend and change-plan: one formula for price and dates

Issue: #779. Review of 2026-10-11 found three formulas for money and wrong period dates (see the issue for file:line and numbers).
Future modules (#780) plug into the same function as the "addons" part.

## Owner decisions (2026-10-11)

1. Renew, expired: new period starts at renewal time; price = plan + addons for the chosen cycle.
2. Renew, not expired: same price; the new period continues from the current end (days left kept).
3. Upgrade mid-period: credit for unused Vietnam civil days of the old period is subtracted from the new cycle price; new period starts today, one full cycle by calendar months.
4. Cycle discounts: monthly 0%, quarterly 0%, semi-annual 5%, annual 10%.
5. Addon mid-period: charged for remaining days. Addons have no price yet (#780): the addon part is 0 for now, but the function takes it.

## Constraints

Store UTC, reason in Vietnam civil days. Additive API changes. Installed iOS/Android do not call these routes (checked on main-real). Merchant renew/upgrade UI is behind `SUBSCRIPTION_UPGRADE_EXTEND_ENABLED = false`.

Status: accepted (owner gave the rules above and asked to implement).
