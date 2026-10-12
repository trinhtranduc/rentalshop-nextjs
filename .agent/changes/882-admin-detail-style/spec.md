# Spec — Admin merchant detail and plan detail in the new admin style

Issue: #882 · Status: draft · Intent: ./intent.md

## Behavior

1. Merchant detail has a `DetailHeader`: back link to Merchants, merchant name, `#id · email`, an Enabled/Disabled pill, and the Add-on button plus the Quick Actions menu (same seven items) as actions.
2. The stat cards, Basic Information, Loyalty and Current Subscription cards use the portal surface (ar line, surface, shadow) and the subscription status is an `ar-pill`.
3. The plan card actions (Upgrade / Change / Extend / Pause / Resume / Cancel or End Trial / View History) are unchanged.
4. Cancel, Pause, Resume and History dialogs use `ar-dialog` (full screen on a phone, 32rem on desktop, History stays wide); Cancel and Pause keep a red confirm button.
5. The plan detail dialog uses `ar-dialog`, shows the name with an Active/Inactive pill, fields in a definition grid, and the Close / Stripe Prices / Edit Plan footer as `ar-dialog-footer`. The Stripe Prices dialog uses the same surface and footer. The create/edit `PlanDialog` uses the `ar-dialog` surface.
6. No new fetch calls, handlers or fields.

## Out of scope

The plans list table (already in the #805 list style), `PlanForm` fields, any API.

## API and data

None.

## Acceptance

- [ ] `tests/admin-merchant-plan-detail-style.test.ts` green in `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`, with `admin-detail-pages` and `admin-dialogs-forms`
- [ ] Before/after screenshots at 1280px and 390px in `/private/tmp/claude-billing/shots882/`
- [ ] No new user-facing strings (English admin strings already used)
