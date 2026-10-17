# Plan — Order lists keep colour only on the status badge

Issue: #1026 · Status: in-progress · Spec: ./spec.md

## Steps

1. iOS: `DateChip.Kind` gains `.sale`; `colors` → dark text, clear fill; `iconColor` grey. `DateChipIcon`
   tints with `iconColor`. `DateChipStack` and `OrderRowCell.fillChipLines` drop the fill and left inset.
   `OrdersHomeLogic.saleChip` feeds sale rows (order rows and customer orders). Product calendar row uses icons.
2. Android: `ChipKind.SALE`; `OrdersBoardLogic.chipColors` neutral + `chipIconTint`; `DateChip` composable
   without fill; `OrderRowDates.saleChip` feeds `BoardRow` for sale rows; product calendar `DayOrderRow` icons.
3. Strings: `orders.chip.sale` / `orders_chip_sale` (en, vi).
4. Tests: update colour / word assertions (intentional change) in iOS `OrdersHomeTests`, Android
   `OrdersHomeTest`; add no fill, grey icon, badge keeps colour, spoken text unchanged, sale chip.
5. Skills: `mobile-parity`, `i18n-keys`, `verify-change`. No API change.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrdersHomeViewModel.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrderRowCell.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductCalendarViewController.swift`
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings`
- `apps/mobile/POS ADBDTests/OrdersHomeTests.swift`
- `apps/mobile-android/.../domain/orders/OrderRowDates.kt`
- `apps/mobile-android/.../ui/orders/v2/OrdersBoardLogic.kt`, `OrdersHomeScreen.kt`
- `apps/mobile-android/.../ui/home/v2/ProductCalendarScreen.kt`
- `apps/mobile-android/app/src/main/res/values{,-vi}/strings.xml`
- `apps/mobile-android/app/src/test/.../OrdersHomeTest.kt`

## Risks

Visual only. Chips were never tappable, so losing the fill changes no interaction.

## Rollback

Revert the commit.
