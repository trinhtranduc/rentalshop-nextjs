# Spec — confirm button reachable in the phone renew / change-plan dialogs

Issue: #1050 · Status: in-progress · Intent: ./intent.md

## Behavior

1. While a subscription dialog with `ResponsiveDialogFooter` is open, `<html>` carries `--ar-vvh` (visible viewport
   height, px) and `--ar-vvt` (visible viewport top offset, px), updated on `visualViewport` resize and scroll, and
   removed when the dialog closes.
2. Below 768 px these dialogs are `top: var(--ar-vvt, 0px)` and `height / max-height: var(--ar-vvh, 100dvh)`:
   Extend (`SubscriptionExtendDialogEnhanced`), Change Plan (`SubscriptionChangePlanDialog`), Renew
   (`ManualRenewalModal`), and Cancel / Pause / Resume / History in `MerchantPlanManagement`. With the keyboard open
   the footer sits right above it. Without a keyboard nothing moves (`--ar-vvh` = the window height).
3. When the viewport shrinks, the focused field inside the dialog is scrolled back into view.
4. Change Plan: when a payment is due and the method or transaction ID is missing, the footer shows one line
   "Choose a payment method and enter the transaction ID to continue." under the summary.
5. Desktop (≥ 768 px) classes and layout are unchanged.

## Out of scope

- API, request payloads, prices, rules.
- Other phone dialogs that use `100dvh` (customers, products, users, outlets).

## API and data

None.

## Acceptance

- [ ] `tests/admin-renew-mobile-footer.test.ts` green (fails on `origin/dev`)
- [ ] Headed Chrome 390×844 and 375×667: renew and change plan up to the confirm button with a simulated keyboard
      (visualViewport 300 px shorter) — the confirm button stays inside the visible viewport; submit both against
      the local DB
- [ ] Headed Chrome 1280×800: dialogs look as before
- [ ] `yarn lint` (admin) and `tsc --noEmit -p apps/admin/tsconfig.json` no new errors
