# Receipt subtracts the discount twice

Issue: #352 · Author: Trinh Tran (with Claude) · Status: accepted · Created: 2026-10-02

## Problem

Production receipt preview for a discounted order shows the discounted total as "Tạm tính" and subtracts
the discount again (order #382509: 130,000 − 20% shows 104,000 → 78,000). Customers see a wrong total.

## Proposed outcome

Receipt: Tạm tính = sum of item totals; Giảm giá = `discountAmount`; loyalty discount on its own line;
Tổng cộng = stored `totalAmount`.

## Affected users and systems

All web roles that preview or print receipts (`client`). No API or stored data change.

## Constraints

The printed copy is built from the preview HTML (inline styles only).

## Decision log

- 2026-10-02 — Total on the receipt is the stored `totalAmount` (source of truth) (Claude, from the create-order formula)
