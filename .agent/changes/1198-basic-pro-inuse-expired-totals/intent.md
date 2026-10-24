# Basic / Pro: in use, expired, and totals

Issue: #1198 · Author: owner · Status: accepted · Created: 2026-10-25

## Problem

In use chips (Basic 34, Pro 15) are only shops còn hạn. Owner needs three views per plan: đang dùng, hết hạn, and tổng.

## Proposed outcome

- Merchants chips = total Basic / total Pro (all shops on that plan).
- In use chips = Basic / Pro còn hạn.
- Expired chips = Basic / Pro hết hạn.
- Click each chip → merchant list with that filter; list total matches the chip.

## Affected users and systems

ADMIN/OPS, admin dashboard. GET `/api/merchants` already supports `plan=` and `status=expired&plan=`.

## Constraints

Admin English. Dual IDs. `main-real`. Trial tile stays enum TRIAL.

## Open questions

None — owner named the three numbers.

## Decision log

- 2026-10-25 — Owner: shop đang dùng Pro/Basic, shop đã Pro/Basic hết hạn, tổng Pro / tổng Basic.
