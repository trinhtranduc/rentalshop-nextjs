# iOS UI e2e: 5 stale tests on dev

Issue: #1040 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

An integration run on `dev` (`ios-e2e.sh --fresh --lang vi --skip test0AuthFlows`) had 38 passed, 5 failed. The app is
right; the tests are stale: the hand-over button is "Đã lấy · thu …" (#888), Sửa đơn moved into the ⋯ sheet (#930),
test5b leaves the cart in edit mode, and test8c/test8d need products that only `prepare-accounts.sh staged` makes.

## Proposed outcome

On a fresh local seed, `test5OrderDetailActions`, `test5dOrderChangeHistory`, `test5eEditOrderSheet`,
`test8cOverlapTagAndRoleSheet` and `test8dCartLines` pass, and `test5bOrderExtendEditPrint` leaves an empty cart.

## Affected users and systems

iOS UI test target and `scripts/mobile-e2e/` only. No app, API or data-model change.

## Constraints

Test-only. Staging writes only to the local e2e database (`prepare-accounts.sh` refuses non-local hosts).

## Decision log

- 2026-10-18 — `ios-e2e.sh` runs `prepare-accounts.sh staged` before merchant runs (opt out with `--no-stage`), rather than
  staging from inside the UI test: a login from the test runner would end the app's single session.
