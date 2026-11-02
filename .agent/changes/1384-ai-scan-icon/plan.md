# Plan — AI scan button

Issue: #1384 · Status: accepted · Spec: ./spec.md

## Steps

1. Tokens: `DesignTokens.swift`, `Tokens.kt`, `globals.css` + `tailwind.config.js`.
2. Icon from the mockup's paths: iOS SVG template asset `aiScanCamera`, Android `AppIcons.AiScan`, web `AiScanIcon`.
3. Use them in `ProductsHomeViewController.swift`, `ProductsHomeScreen.kt`, `products/page.tsx`.
4. Verify: `yarn lint`, type-check `apps/client`, iOS Development Simulator build and `ImageSearchQueryTests`, `./gradlew :app:assembleDebug`, one look each on Simulator, AVD, headed Chrome.

## Files

- `apps/mobile/POS ADBD/Utils/DesignTokens.swift`, `Assets.xcassets/aiScanCamera.imageset/`, `Viewcontrollers/Products/v2/ProductsHomeViewController.swift`, `POS ADBDTests/ImageSearchQueryTests.swift`
- `apps/mobile-android/.../ui/theme/Tokens.kt`, `ui/common/AppIcon.kt`, `ui/home/v2/ProductsHomeScreen.kt`
- `apps/client/app/globals.css`, `tailwind.config.js`, `components/shell/Icon.tsx`, `products/page.tsx`

## Risks

Client-only drawing. No API path changes, so installed apps are not affected. On the dark web theme the blue corner is 2.65:1 against the surface; the white text (5.7–6.7:1) still identifies the button.

## Rollback

Revert the PR.
