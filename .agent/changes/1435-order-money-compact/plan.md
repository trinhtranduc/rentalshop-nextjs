# Plan — Order detail: one compact money block

Issue: #1435 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first. iOS `OrderDetailLogicTests.swift` and Android `OrderMoneyBlockTest.kt`: the lines of each of the 9 cases, the merge of
   the last stage, "Còn phải thu" hidden when equal to the amount due. Pure `moneyBlock(...)` stubbed so that they fail on assertions.
2. `OrderDetailLogic.moneyBlock` on both apps: which lines show. It only calls the existing rules.
3. iOS view: `moneySections` draws the lines; `InstallmentCardView.make` becomes the block inside THANH TOÁN; "Tạm tính" leaves `itemsSection` for rentals.
4. Android view: `DetailBody` draws the lines with its own `MoneyBlockRow` / `MoneyBlockDue`; `InstallmentCard` redrawn; `MoneyRow` and the sheets unchanged.
5. One string for the sub-line (`order.detail.cashBreakdown`, `detail_cash_breakdown`), `en` + `vi`.
6. UI test `testOrderMoneyCases`: opens the 9 seeded orders and takes a screenshot of each. Same by adb on Android.
7. Skills: `mobile-parity`, `i18n-keys`, `verify-change`, `mobile-e2e-local`.

## Verify

```bash
# iOS, erased dedicated simulator
xcodebuild test -workspace "POS ADBD.xcworkspace" -scheme Development -only-testing:"POS ADBDTests" ...
# Android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:testDebugUnitTest :app:assembleDebug
# Share and receipts untouched
git diff origin/dev --stat -- '*OrderShareRenderer*' '*PrinterManager*' '*DepositReceipt*' '*OrderShareImage*' '*OrderShareModel*'
```

## Files

- `apps/mobile/POS ADBD/ViewModels/OrderDetailLogic.swift` — `OrderMoneyLine`, `OrderMoneyBlock`, `moneyBlock`
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderDetailViewController.swift` — draws the block
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/DepositPlanViews.swift` — the stages inside the block
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings` — one string
- `apps/mobile/POS ADBDTests/OrderDetailLogicTests.swift`, `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift` — tests
- `apps/mobile-android/.../domain/orders/OrderDetailLogic.kt` — the same rules
- `apps/mobile-android/.../ui/orders/v2/OrderDetailV2Screen.kt`, `DepositPlanViews.kt` — draws the block
- `apps/mobile-android/app/src/main/res/values{,-vi}/strings.xml` — one string
- `apps/mobile-android/.../domain/orders/OrderMoneyBlockTest.kt` — tests

## Risks

- A number shown differs from the button or the share image: `moneyBlock` only calls the existing rules, and tests pin the 9 cases.
- UI tests look a stage up by id: all ids stay; the merged last stage has no `deposit.stage.rest` on a booked order. No test reads it there.
- Both apps are installed versions on stores: nothing in the API changes, so old apps are not affected.

## Rollback

Revert the PR. No data or API change.
