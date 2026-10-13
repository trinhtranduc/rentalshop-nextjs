# #951 Products priced 0đ, free cart lines, one cart line per add

Issue: #951 · Author: Trinh Tran (owner decision 13/10/26) · Status: in-progress · Created: 2026-10-13

## Problem

A shop cannot create a 0đ product (API `pricingOptions[].price` must be > 0; web, iOS and Android forms drop or
refuse 0) and cannot give an item free in an order: every cart treats a line price of 0 as "Nhập giá" and blocks
Tạo đơn / Lưu thay đổi. The apps also merge a second add of the same product into one line, so one unit cannot be
paid and another free.

## Proposed outcome

1. API: a rent price option of 0 (FIXED or DAILY) and a sale price of 0 are accepted and stored; negatives refused.
2. Web, iOS, Android product forms accept 0 (create and edit); an empty box is still "no price".
3. Cart and order edit: a 0đ product shows "0đ" and creates normally; a priced line may be set to 0 (free) in the
   existing per-line price sheet. Only a line with no price at all asks "Nhập giá".
4. iOS and Android: every add appends a new cart line with its own id; per-line actions target that line;
   availability, badges and counts sum the lines of a product; an edited order keeps its lines.
5. List, detail, receipt, share image show "0đ". Revenue, stock and availability rules are unchanged.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY (product prices); every role that creates orders (line price, as today).
api, packages/utils (zod), packages/validation, packages/database, client web, iOS, Android. No migration.

## Constraints

- Additive: no field removed or retyped; old apps keep working (see the PR compatibility table).
- OUTLET_STAFF product-price limits unchanged.
- Admin web (`packages/ui` ProductForm / old order form) is not changed.

## Open questions

None.

## Decision log

- 2026-10-13 — "0đ rent price" is an active pricing option with price 0. A product without options and
  `rentPrice` 0 stays "no price" (that is how every app saves a product without a rent price). (agent)
- 2026-10-13 — `salePrice` 0 already means "not for sale" on stored rows (iOS update and Android always send 0 for
  an empty box). A sale line priced 0 already sells at 0 without a prompt; it now shows "0đ" instead of "Nhập giá".
  List and detail keep hiding a 0 sale price (the two cannot be told apart). (agent)
- 2026-10-13 — Owner: free items via the existing line price sheet (0 accepted), no new button; every add is a new
  line on iOS and Android. (owner via coordinator)
- 2026-10-13 — Web Tạo đơn keeps merging a second add into the line (owner named the apps); its line actions are
  keyed by line so an order made in the apps with two lines of one product edits correctly. (agent)
