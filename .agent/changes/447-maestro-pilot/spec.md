# Spec — Maestro pilot for mobile e2e

Issue: #447 · Status: draft · Intent: ./intent.md

## Behavior

1. One flow file `apps/mobile-e2e-maestro/flows/rent-handover.yaml` (shared by both platforms; platform
   differences only through Maestro `when: platform`) does: launch with a clean state → skip notification prompt and
   onboarding → log in as `merchant1` (from env) → add one product to the cart as a rental → create the order →
   open it → hand over → assert the status shows "Đang thuê" / "Renting".
2. `scripts/mobile-e2e/maestro-e2e.sh --platform ios|android [--runs N]` runs the flow against the local stack from
   `seed-local.sh` + `api-local.sh`, using the skill's env (`E2E_*`), and writes logs and screenshots to `$E2E_OUT/maestro/`.
3. The script refuses the owner's emulators (`vm_pos`, `vm_kitchen`, ports 5554/5556), like `android-e2e.sh`.
4. The flow passes 5 runs in a row on each platform, or the failures are recorded with the cause.
5. `plan.md` "Results" holds the comparison and a go / no-go:
   - pass rate over 5 runs: Maestro vs XCUITest `test2CartRent` + `test5OrderDetailActions`, and vs the adb scenario
   - wall time per run
   - Vietnamese input on Android (type "Áo dài" into product search)
   - selectors: how many needed an accessibility id
   - setup cost (install, Java, CI fit)

## Out of scope

- Porting the other flows, removing XCUITest or the adb scripts, CI wiring, Maestro Cloud.

## API and data

None. Uses the seeded local DB only.

## Acceptance

- [ ] Behaviors 1–4 shown by script output (pass counts) in plan.md
- [ ] Behavior 5 table filled in with numbers, not guesses
- [ ] Any accessibility id added on iOS has the same id on Android (`mobile-parity`), and old screens are unchanged
- [ ] No credentials committed; script refuses vm_pos/vm_kitchen
