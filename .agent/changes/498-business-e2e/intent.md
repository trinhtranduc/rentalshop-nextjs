# Intent — Business e2e suite on a local seeded API

Issue: #498 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-06

## Problem

Owner: "tạo bộ testcase e2e từ tạo sản phẩm lên đơn check doanh thu, thay đổi trạng thái check doanh thu ở các
trạng thái, check trùng đơn, giảm số lượng ... đầy đủ test case e2e có thể dùng local seed database".
Money rules (Overview #484/#492/#494, collateral, cancellations, Vietnam days) and availability rules are only unit
tested or checked by hand on a simulator. Several hotfixes came from numbers the unit tests did not see together.

## Proposed outcome

One command (`scripts/e2e/business-e2e.sh`) seeds a local database, starts a local API, drives the endpoints the
apps use from product creation through every status change and edit, and asserts the Overview, balance, stock and
availability numbers computed in the test. It runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh and prints a summary.
Bugs it finds are filed and kept as `test.failing` cases until fixed.

## Affected users and systems

Developers and agents before an API/mobile PR. Roles exercised: MERCHANT, OUTLET_STAFF, another MERCHANT.
Systems: local Postgres + local `apps/api` only.

## Constraints

LOCAL only (never dev-api, Railway or production). No change to API or package business logic. The default
`cd tests && yarn test` stays unchanged. Runs repeat without reseeding (deltas, fresh rows). Do not use the
user's emulators or the mobile e2e database/port.

## Open questions

Listed in `tests/e2e/TEST_CASES.md` (Q1–Q6) and the PR.

## Decision log

- 2026-10-06 — Main merchant = the seed merchant on an ACTIVE plan (merchant1 is TRIAL with 500 products). (Claude)
- 2026-10-06 — Overview checks are deltas around each action; product/customer checks are absolute. (Claude)
- 2026-10-06 — Owner extended scope: edits, price maths, Overview agreement, order numbers, AGENTS.md order number line. (owner via coordinator)
