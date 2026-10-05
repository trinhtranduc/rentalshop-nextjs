# Spec — Cart "+ Add" goes to the product list

Issue: #433 · Status: approved · Intent: ./intent.md

## Behavior

1. Android: "+ Add" in `CartV2Screen` pops the root back stack to `main` (dropping customer list,
   customer detail, order detail) and selects the Home tab.
2. Android: a tab request made while the Main screen is not composed (the cart covers it) is kept
   and applied when Main comes back (`MainTabRouter` holds a pending tab instead of a fire-and-forget
   event). This also applies to "open Orders after create".
3. iOS: "+ Add" in `CartV2ViewController` pops when the screen below is `ProductsHomeViewController`;
   otherwise it pops its own navigation stack to root and selects the Home tab (index 0).
4. Both: `CartStore` is not touched, so the customer (and lines, dates) stay in the cart.

## Out of scope

Legacy cart (flag off), API, strings.

## API and data

None.

## Acceptance

- [ ] Android unit test `CartAddItemsTest` (back-stack target + pending tab) red before, green after
- [ ] iOS unit test in `ProductsV2Tests` for the pop-or-open-Home decision
- [ ] `./gradlew :app:testDebugUnitTest :app:assembleDebug` and iOS `xcodebuild build` succeed
