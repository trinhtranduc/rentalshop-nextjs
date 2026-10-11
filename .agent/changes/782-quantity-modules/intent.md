# 782 — Quantity modules replace plan-limit addons (step 1 of #780)

Issue: #782. Requirements and owner decisions: #780 (comments of 2026-10-11). Builds on #779 (`calculateRenewalTotal` takes `addonMonthlyTotal`).

## Why
Today's `PlanLimitAddon` raises limits for free, forever, with no price or dates. The owner wants paid modules, managed as one system with addons, priced in VND.

## Owner decisions used here
- One VND price per module for every plan; plans never include modules; admin defines modules and prices.
- Mid-period purchase: charged for the remaining Vietnam civil days of the subscription period.
- Renewal: plan + modules for the cycle, same 0/0/5/10 % discount.
- Removal at the end of the period, no refund, never below current usage.
- Price changes apply to new purchases and the next renewal.
- Today's addons become modules at price 0; nothing is charged automatically.
- Over limit after expiry or removal: keep what exists, block creating new.
- Keep it simple. Feature modules = step 2. Merchant self-purchase = step 3, later.

Status: accepted for the decisions above; spec waiting for the owner's go before code (migration + money).
