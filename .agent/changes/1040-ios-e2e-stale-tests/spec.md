# Spec — iOS UI e2e: 5 stale tests on dev

Issue: #1040 · Status: approved · Intent: ./intent.md

## Behavior

1. test5 and test5d find the hand-over confirm button by "Đã lấy" / "Handed over" (old "Đã giao" kept as a fallback).
2. test5e opens Sửa đơn through ⋯ (`tapOrderSheetRow`), and leaves a leftover edit cart with "Huỷ sửa" instead of saving it.
3. test5b leaves edit mode with "Huỷ sửa" after the Sửa đơn screenshot; the cart is empty afterwards.
4. test5d leaves any leftover edit cart first, so its cart CTA is "Tạo đơn".
5. `ios-e2e.sh` stages the three products for merchant runs (`prepare-accounts.sh staged`); `--no-stage` skips it; a
   staging failure only warns.

## Out of scope

App code, Android, API.

## Acceptance

- [ ] The five tests plus test5b and the test before each fixed one pass on a fresh local seed (`--lang vi`).
