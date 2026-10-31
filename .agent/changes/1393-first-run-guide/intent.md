# First-run guide on mobile: from an empty shop to the first order

Issue: #1393 (card), #1394 (bubbles and UI test) · Author: Claude · Status: in-progress · Created: 2026-10-31

## Problem

A new owner finishes the 3 intro pages and lands on an empty Home. Nothing says what comes first, that an order needs a product and a customer, or that the customer is created inside the cart. An empty price saves too, so the first order can come out at 0đ.

## Proposed outcome

Variant A chosen by the owner, tab "★ Cầm tay: đơn đầu tiên" of https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4: a card "Bắt đầu: 3 việc" on Home (PR 1), plus 6 bubbles on 4 screens (PR 2). It uses the shop's real data, no sample data, and never blocks the app.

## Affected users and systems

`MERCHANT` on a shop with 0 orders, on iOS and Android. Not `OUTLET_ADMIN`, `OUTLET_INVENTORY`, `OUTLET_STAFF`. No API, web or migration change.

## Constraints

- No API path changes. No form validation changes.
- Installed apps are untouched: this only adds calls to two existing GET routes with existing parameters.
- Strings in en and vi only, as both apps have only those.
- iOS is the reference; Android matches it in the same round.

## Open questions

None for the build. #984 (sample data at sign-up) is undecided by the owner; if it ships, a new shop has an order and this guide never shows.

## Decision log

- 2026-10-31 — Variant A chosen, shipped as two PRs so the card can ship alone (owner).
- 2026-10-31 — pr-governance needs a closing keyword on each PR, so PR 2 has its own issue #1394.
