# Plan — #1607

Issue: #1607 · Status: accepted · Spec: ./spec.md

1. Failing unit tests (one commit): iOS `POS ADBDTests/ProductsV2Tests.swift`, Android
   `app/src/test/.../domain/products/BranchListingTest.kt` (spec 1-7).
2. iOS `Model/ProductsV2.swift` `BranchListing` + `BranchTickRow.stock` var; `ProductFormViewController.swift` box (spec 8-11);
   Home insert after save (spec 12). Strings in the 12 `*.lproj/Localizable.strings` (append safely, check `wc -l`).
3. Android `BranchListing.kt`, `ProductFormV2Screen.kt`, `ProductsV2Api` create / save; strings in 12 `values-*/strings.xml`.
4. Verify:
   - unit tests on both platforms; iOS build; `./gradlew :app:assembleDebug :app:testDebugUnitTest`;
   - `yarn --cwd tests test locales-complete android-strings-apostrophe hardcoded-vietnamese`;
   - Simulator and emulator in front against a local API + local DB: create at A only, create at B only, untick all,
     edit with units on rent, a branch role edit; screenshots.
