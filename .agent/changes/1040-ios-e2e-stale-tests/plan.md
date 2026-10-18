# Plan — iOS UI e2e: 5 stale tests on dev

Issue: #1040 · Status: approved · Spec: ./spec.md

## Steps

1. `E2E.leaveEditMode()` helper: Home → cart → "Huỷ sửa" (`cart.edit.cancel`) → confirm → back.
2. test5 / test5d: hand-over button labels; test5b: `leaveEditMode()` after Sửa đơn; test5d: `leaveEditMode()` first.
3. test5e: Sửa đơn via ⋯; leftover edit cart via `leaveEditMode()`.
4. `ios-e2e.sh`: run `prepare-accounts.sh staged` for merchant runs, `--no-stage` to skip; skill doc line.
5. Verify on a local seed (own Postgres, own simulator): the five tests, test5b, and each predecessor.

## Files

- `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift` — tests and helper
- `scripts/mobile-e2e/ios-e2e.sh` — staging step
- `.claude/skills/mobile-e2e-local/SKILL.md`, `tests/e2e/TEST_CASES.md` — docs

## Risks

- Staged products show up in other merchant flows (Home list). The overlap one is held today; flows that add
  "the first product" skip disabled + buttons, and `rentCta` already accepts "Vẫn tạo đơn".

## Rollback

Revert the PR; tests only.
