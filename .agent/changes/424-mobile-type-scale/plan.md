# Plan — One type scale for the new mobile UI

Issue: #424 · Status: in-progress · Spec: ./spec.md

## Steps

1. Tokens + tests
   - iOS `apps/mobile/POS ADBD/Utils/DesignTokens.swift`: `DS.TextSize` (+ `DS.Gap` for line gaps and row
     padding); test `POS ADBDTests/TypeScaleTests.swift`.
   - Android `ui/theme/Tokens.kt`: `DS.TextSize` (sp) + `DS.Gap`; test `ui/common/TypeScaleTest.kt`.
2. Apply the mapping rule on every new-UI file, replacing literal sizes with tokens:
   - iOS: `Viewcontrollers/Orders/*` (OrdersViewController, OrderRowCell, OrdersFilterSheet),
     `Viewcontrollers/OrderDetail/*`, `Viewcontrollers/Products/v2/*`, `Viewcontrollers/Customer/v2/*`,
     `Viewcontrollers/Auth/v2/*`, `OnboardingV2ViewController`, `SettingsV2ViewController`,
     `OverviewV2ViewController`, `CalendarV2ViewController`.
   - Android: `ui/**/v2/*`, `ui/onboarding/OnboardingV2Screen.kt`, and new-UI-only helpers.
3. Spacing: order row padding 12 → 15 and line gap → 5; product row padding 10 → 14, min height 88 → 96.
4. Leave shared code (tab bar, `OverviewRankingOrdersViewController`, `AppComponents.kt` defaults used by
   old screens) unchanged.
5. Verify (`verify-change`, `mobile-parity` step 8): unit tests on both platforms, iOS `xcodebuild` and
   Android `:app:assembleDebug` when disk allows, screenshots of the new screens next to the boards.

## Files

- Tokens and tests on both platforms; the new-UI files above.

## Risks

- A bigger label clips in a fixed-height box (calendar cells, pills, cart bar). Check each fixed height.
- A shared helper used by old screens changes size. Only flag-gated files change.

## Rollback

Revert the commit; the screens are also behind server flags.

## Sizes changed (old → new, token) — same on iOS and Android unless noted

| Screen | Element | Old | New |
|---|---|---|---|
| Orders list | status tag, "Chưa soạn đồ"/shortage pills | 11 | 12 `pill` |
| Orders list | customer name, row total | 15 bold | 17 `name` |
| Orders list | item line ("Product 3 ×2, …") | 13 | 15 `body` |
| Orders list | order code · dates, "còn thu / trả cọc / đã thu đủ" | 12 | 14 `secondary` |
| Orders list | section band title + summary, status chips, sort, count, search summary | 13 | 14 `secondary` |
| Orders list | Đơn bán button, segmented control | 14 | 15 `body` |
| Orders list | row padding / line gap | 12·16 / 3 | 15·16 / 5 `Gap` |
| Filter sheet | sort options, date presets | 14 | 15 · date basis 13 → 14 · hint 12 → 14 · labels 13 → 14 |
| Order detail | status pill | 10 | 12 (shared badge: optional size, old screens keep 10) |
| Order detail | order code (top bar), late title, notes, info label, money label | 14 | 15 |
| Order detail | due line, section titles, item pricing line | 13 | 14 |
| Order detail | progress labels | 12 | 14 |
| Order detail | info value, item total, "Thu khi giao" label | 15 semibold | 17 |
| Order detail | item name (15 medium), bar buttons, money values | 15 | 15 (unchanged) |
| Hand-over / return / extend / notes sheets | subtitle, collateral, item × qty, text lines | 14 | 15 · method label, errors, photo count 13 → 14 |
| Products home | name, price | 15 bold | 17 |
| Products home | barcode/code line | 13 | 15 |
| Products home | stock "Còn N" | 12 | 14 |
| Products home | /lần unit, per-day/sale extra, shop line | 12–13 | 14 |
| Products home | cart bar count / total / "Tạo đơn" | 13 / 16 / 15 | 14 / 17 / 17 (canvas) |
| Products home | row padding / min height / line gap | 10 / 88 / 3 | 14 / 96 / 5 |
| Product detail | meta, strip caption, chips, order meta, state text | 12–13 | 14 |
| Product detail | price tile label / value | 12 / 16 | 14 / 17 |
| Product detail | strip day / free count | 11 / 14 | 12 / 15 |
| Product detail | "Đơn của sản phẩm", order row name | 16 / 15 | 17 |
| Product form | field labels, unit "đ", default-pricing title | 14 | 15 · warnings, stock note 13 → 14 · cover tag 10 → 12 · photo hint stays 12 (canvas) |
| Shared v2 views | section header 13 → 14 · segmented 14 → 15 (compact 13 → 14) · stepper number 16 → 17 · total row label 15 → 17 |
| Cart | customer name, dates, item name, item total | 15 | 17 |
| Cart | phone, days pill, calc line, "Còn N", collect caption, avatar | 13 | 14 |
| Cart | "+ Thêm", "Đổi" | 14 | 15 |
| Calendar | month title | 15 semibold | 17 |
| Calendar | day number | 14 | 15 |
| Calendar | row tag 11 → 12 · name, total 15 → 17 · item line 13 → 15 · note 12 → 14 · band 13 → 14 · line gap 2 → 4 · weekday/legend stay 12 (canvas) |
| Overview | period button 14 → 15 · stat value 16 → 17 · captions 13 → 14 · bar labels 11 → 12 · top product revenue 15 → 17, count 13 → 14 · period sheet: checked option 17 bold, others 15 |
| Settings | profile name 16 → 17 · subtitle 13 → 14 · row value 14 → 15 · avatar initials stay 15 (canvas) |
| Customers | names 16 → 17 · subtitles, dates, section labels 13 → 14 · tile label 12 → 14 · phone 14 → 15 · order title 15 → 17 · order amount 14 → 15 · field labels 14 → 15 · line gaps 2 → 4 |
| Auth / onboarding | field labels, chips, terms, notes, errors-in-footer 14 → 15 · hints, inline errors, step label 13 → 14 · inputs and buttons 16 · headings 26–30 and 16 subtitles unchanged |

Unchanged on purpose: tab bar (shared shell; Android labels are 11, iOS is the shared UITabBar), search fields stay 15
(the rule keeps 15 controls), 20 sheet titles and 18–30 headings stay literal, old screens and their shared helpers.
