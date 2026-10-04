# Plan — Gia hạn lets staff enter the extra rent

Issue: #425 · Status: accepted · Spec: ./spec.md

## Steps

1. TDD the payload:
   - iOS `Model/RentalExtension.swift`: `newTotal(oldTotal:extra:)`, `rentalDuration(pickup:newDay:)`,
     `updateRequest(...) -> UpdateOrderRequest`; tests in `POS ADBDTests/Phase8Tests.swift` (encode the request and
     check the JSON keys).
   - Android `domain/orders/RentalExtension.kt`: `newTotal`, `rentalDuration`, `update(...) -> ExtensionUpdate`;
     tests in `app/src/test/.../Phase8LogicTest.kt`.
2. UI:
   - iOS `OrderExtendSheetViewController`: money field (number pad, `MoneyInput`), "Tổng mới" label, save with
     `RentalExtension.updateRequest`.
   - Android `OrderExtendSheet`: `OutlinedTextField` (number keyboard, `MoneyInput`), "Tổng mới" text;
     `ApiParity.updateOrderFull` gains optional `rentalDuration` / `totalAmount`.
   - Android `OrderDetailV2Screen` "Lịch" row: append the day count.
3. Strings (`i18n-keys`, `mobile-parity`): iOS `en.lproj` / `vi-VN.lproj`; Android `values` / `values-vi`.
4. Verify: iOS `-only-testing:"POS ADBDTests"` on "iPhone Air"; Android
   `:app:testDebugUnitTest :app:assembleDebug -PapiBaseUrl=http://10.0.2.2:3197`; manual check against the prebuilt
   API on :3197 with DB `anyrent_mobile_e2e`, screenshots in scratchpad `w425/`.

## Files

- `apps/mobile/POS ADBD/Model/RentalExtension.swift`, `Viewcontrollers/OrderDetail/OrderExtendSheetViewController.swift`
- `apps/mobile/POS ADBDTests/Phase8Tests.swift`, `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/orders/RentalExtension.kt`
- `.../ui/orders/v2/OrderExtendSheet.kt`, `.../ui/orders/v2/OrderDetailV2Screen.kt`, `.../data/ApiParity.kt`
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/Phase8LogicTest.kt`, `res/values{,-vi}/strings.xml`

## Risks

- Money is typed by hand: a wrong amount changes the order total. The "Tổng mới" line shows the result before save.
- Loyalty guard on the API (`REDEEM_EXCEEDS_TOTAL`) only fires when the total goes down; here it only goes up.

## Rollback

Revert the PR; the sheet goes back to saving `returnPlanAt` only.
