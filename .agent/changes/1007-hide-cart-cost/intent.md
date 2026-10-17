# Hide cost price in the mobile cart

Issue: #1007 · Author: agent · Status: in-progress · Created: 2026-10-17

## Problem

Since #888 the iOS and Android cart shows "Giá vốn" per line, "Tổng giá vốn", and "Lãi dự kiến" (sale). The cart is often shown to the customer, who then sees the shop's cost and margin.

## Proposed outcome

The cart shows no cost price for any role. Product form and product detail keep cost price.

## Affected users and systems

Every role on iOS and Android. No web, no API.

## Constraints

- Minimal: no toggle, no eye button.
- Keep `costPrice` on the cart line and in saved drafts (old drafts decode).

## Decision log

- 2026-10-17 — Hide cost in the cart for all roles; keep it in the product form and detail. (owner)
