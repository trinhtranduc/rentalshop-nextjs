# Cart "+ Add" from a customer goes back instead of to products

Issue: #433 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-05

## Problem

Settings → Customers → a customer → "Create order for this customer" opens the redesigned cart
(`newProducts`). Its "+ Add" button only pops the screen, so it lands back on the customer page. The
only way to add items is to leave for Home by hand. Found on Android in the #391 e2e run; iOS
(`CartV2ViewController.goBack`) has the same bug.

## Proposed outcome

"+ Add" always opens the product list (Home tab). The cart keeps the customer, and the cart button on
Home brings the user back to the same cart.

## Affected users and systems

All roles that create orders. Android and iOS (redesigned cart only). No API change.

## Constraints

- Opening the cart from Home must still behave as today (one step back to the product list).
- No change to the cart contents, customer or dates on the round trip.

## Decision log

- 2026-10-05 — Fix both apps in one PR (mobile-parity) (agent)
