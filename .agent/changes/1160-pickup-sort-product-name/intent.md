# Pickup sort and product search by name

Issue: #1160 · Author: owner · Status: accepted · Created: 2026-10-21

## Problem

The shop web order list cannot sort by the planned pickup day. Product search should match the product name or the barcode, and should not match the description.

## Proposed outcome

The Đơn hàng menu has "Ngày lấy sớm nhất" (`pickupPlanAt` ascending; orders with no pickup day stay last). Product search matches the product name or a barcode that contains the typed text. The description is not searched.

## Affected users and systems

Shop web order list and every product search (`GET /api/products?q=`), including iOS and Android home search and barcode scan.

## Constraints

No new order-list field. Exact barcode match stays so installed apps that send the scanned code as `q` still find the product. Merchant scope and the accent rules stay.

## Open questions

None.

## Decision log

- 2026-10-21 — Sort by earliest pickup. Product search matches the name or the barcode (owner corrected the name-only ask). Description is not searched.
