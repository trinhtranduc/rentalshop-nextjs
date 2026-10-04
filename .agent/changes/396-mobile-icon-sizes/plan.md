# Plan — Mobile icon sizes and style match the boards

Issue: #396 · Status: accepted · Spec: ./spec.md

## Design-system rule (for the He-thong board)

- **Canvas px = icon box.** An icon drawn `width="20"` on a board is a 20×20 box; the 2px outline glyph fills
  about 75–88% of it (measured: camera/barcode/search 75%, bell 88%, plus 67%).
- **Sizes:** `sm` 18 (inline in fields and rows, chevrons), `md` 20 (buttons inside fields, header actions),
  `lg` 22 (top-bar actions, tab bar). Other numbers only when the board draws them (16, 14).
- **iOS:** SF Symbols, `pointSize = 0.78 × canvas px`, rounded to 0.5pt (18 → 14, 20 → 15.5, 22 → 17),
  weight `.medium` (`.semibold` where the board stroke is 2.2–2.4: back/close, the + on rows).
  Use `DS.symbol(name, DS.Icon.md)`. Optical corrections: `camera` ×0.8, `chevron.*` ×0.88.
- **Android:** `Icons.Outlined.*` at the same dp. Note: core `Icons.Outlined.Warning` is a filled triangle;
  use `Icons.Outlined.WarningAmber`.
- **Android:** `Icons.Outlined.*` (or `AutoMirrored.Outlined`) at the same number in dp (`DS.Icon.Md` = 20.dp).
  A glyph Material lacks (barcode) is drawn from the board's SVG path with a 2dp round stroke.
- **Outline only.** No filled icons on the new screens.

### How the iOS factor was measured

SF Symbols rendered at 100pt (macOS AppKit, same font as iOS), ink bounding box per point vs. the board SVG
rendered at its own box:

| Symbol | Board box | Board ink | SF ink per pt | Best factor |
|---|---|---|---|---|
| camera | 20 | 15.0 × 13.3 (75%) | 1.206 | 0.622 |
| bell | 22 | 16.5 × 19.3 (88%) | 1.009 | 0.867 |
| plus | 22 | 14.8 × 14.8 (67%) | 0.816 | 0.821 |
| barcode.viewfinder | 20 | 15.0 × 13.3 (75%) | 0.968 | 0.775 |
| magnifyingglass | 18 | 13.5 × 13.5 (75%) | 0.970 | 0.773 |

Seven more checked later (printer 0.750, phone 0.825, exclamationmark.triangle 0.874, calendar 0.849,
chevron.right 0.687, xmark 0.743, chevron.left 0.683); median of all twelve 0.774.
Geometric mean of the first five 0.767, median 0.775 → **0.78**. Error at 0.78: barcode/search +1%, plus −5%, bell −10%,
camera +26% before its ×0.8 correction, ~0% after. Stroke: plus at 17.2pt is 1.5px `.regular`, 2.0px
`.medium`, 2.25px `.semibold`; the board's 2/24 × 22 = 1.83px, so `.medium`.

## Steps

1. Tokens + tests:
   - iOS `Utils/DesignTokens.swift`: `DS.Icon`, `DS.symbolPointSize(for:name:)`, `DS.symbol(_:_:weight:)`;
     test `POS ADBDTests/IconTokensTests.swift`.
   - Android `ui/theme/Tokens.kt`: `DS.Icon`; `ui/common/AppIcon.kt`: `AppIcon`, `AppIcons.Barcode`;
     test `IconTokensTest.kt`.
2. Apply on each new screen (flag swap: iOS `FeatureFlags`, Android `MobileFeature.NEW_*`):
   orders tab, order detail + sheets, products home / detail / form, cart v2, calendar v2, overview v2, settings v2.
3. Shared Android components used by old screens (`AppSearchField`) get an optional icon size, default unchanged.
4. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:testDebugUnitTest :app:assembleDebug`,
   screenshots next to the boards, and old screens with the flags off.

## Files

- iOS: `DesignTokens.swift`, `OrdersViewController.swift`, `OrderRowCell.swift`, `OrderDetailViewController.swift`,
  `OrderNotesEditorViewController.swift`, `ProductsHomeViewController.swift`, `ProductDetailViewController.swift`,
  `ProductFormViewController.swift`, `ProductsV2Views.swift`, `CartV2ViewController.swift`,
  `CalendarV2ViewController.swift`, `OverviewV2ViewController.swift`, `SettingsV2ViewController.swift`, test
- Android: `Tokens.kt`, `AppIcon.kt`, `AppComponents.kt` (optional param), the v2 screens under `ui/*/v2/`, test

## Risks

- Old screens: only flag-gated files change; the shared search field keeps its default size.

## Rollback

Revert the PR; the screens are also behind server flags.

## Icons changed (board size → token)

| Screen | Icon | Board | iOS | Android |
|---|---|---|---|---|
| Products home | + (top bar) | 22 | 20pt → lg (17pt) | 24dp filled → Lg outlined |
| Products home | bell | 22 | none (~17pt font) → lg | 24dp filled → Lg outlined |
| Products home | search | 18 | none → sm (14pt) | 18dp → Sm outlined |
| Products home | camera | 20 | 20pt → md ×0.8 (12.5pt) | 22dp filled → Md outlined |
| Products home | scan | 20 | barcode.viewfinder 20pt → md | QrCodeScanner 22dp → barcode glyph Md |
| Products home | + on row | 18 | 16pt bold → sm semibold | 24dp → Sm |
| Products home | cart bar › | 18 | – | 24dp → Sm |
| Orders tab | search | 18 | system → sm | 20dp → Sm |
| Orders tab | filter | 20 | default → md | 24dp → Md |
| Orders tab | call | 18 | phone.fill default → phone sm | 20dp filled → Sm outlined |
| Order detail | back | 22 | (base nav bar, unchanged) | 24dp → Lg |
| Order detail | print / more | 20 | default → md | 24dp → Md (more: horizontal) |
| Order detail | late warning | 20 | default → md | 24dp filled → WarningAmber Md |
| Order detail | call button | 16 | 14pt → 16 | 16dp outlined |
| Notes editor/sheet | add photo | 20 | plus → camera md | AddPhotoAlternate → camera Md |
| Product detail | back | 20 | 17pt bold → md semibold | 24dp → Md |
| Product form | close | 22 | 18pt bold → lg semibold | 24dp → Lg |
| Product form | add photo | 22 | default → lg | 24dp → Lg |
| Product form | scan | 20 | default → md | QrCodeScanner → barcode Md |
| Product form / cart rows | › | 16 | 14 box → 16 | 24dp → 16dp |
| Cart | back | 22 | 18pt bold → lg semibold | 24dp → Lg |
| Calendar | month ‹ › | 20 | 17pt → md semibold | 24dp → Md |
| Calendar | row › | 18 | 14 box → sm | 18 wide → Sm |
| Overview | period ˅ | 16 | 12pt → 16 | 18dp → 16dp |
| Overview sheet | close / calendar | 20 | default → md | 24dp / 20dp → Md |
| Settings | row › | 18 | 14 box → sm | 18dp outlined |
