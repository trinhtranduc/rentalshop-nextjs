# Add-on renewal rules

Issue: #870 (Refs #850, PR #869) · Author: agent for Trinh Tran · Status: accepted (owner 2026-10-11, "làm đơn giản và chuẩn") · Created: 2026-10-11

## Problem

#869 charges add-ons only in `POST /renew`. `extend` and change-plan start or extend a paid period without them.
A catalog row's pack size cannot change once a shop uses it. A shop can switch to a single-branch plan while it
still has branch add-ons.

## Outcome

- Every manual path that starts or extends a paid period (renew, extend + its preview, change-plan) charges
  plan + the shop's renewed add-ons, through one shared helper.
- Pack size is editable when shops use the row. Bought items keep their captured price and pack size until the
  paid period ends; the next renewal / extension / plan change takes the current ones.
- A shop's item: more packs apply now and are charged prorated; fewer packs apply from the next period, no refund.
- Switching to a plan without multi-branch while branch add-ons are active is refused with one translated code.

## Constraints

- Keep the 3/6/12-month mid-period formula (#869).
- Stripe / Lemon Squeezy: not touched (see spec). No new screens, no forecasting UI.
- Installed apps do not call these routes. Additive response fields only.
