# Plan — Mobile onboarding and customers

Issue: #387 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure logic + tests:
   - iOS `Model/CustomersV2.swift`: `CustomersV2Logic` (initials, phone digits / duplicate match, name split /
     payload, row subtitle, tiles), Decodable page models; tests `POS ADBDTests/CustomersV2Tests.swift`.
   - Android `domain/customers/CustomerRules.kt` (same helpers + JSON parsing); tests `CustomerRulesTest.kt`.
2. View models with a data-source protocol and a generation token (stale-drop): iOS `ViewModels/CustomersV2ViewModel.swift`,
   Android `ui/customers/v2/CustomersV2ViewModel.kt` + `data/CustomersV2Api.kt`.
3. iOS screens `Viewcontrollers/Customer/v2/*` (picker sheet, new form, list, detail) and
   `Viewcontrollers/Onboarding/OnboardingV2ViewController.swift`; wire in `CartV2ViewController.pickCustomer`,
   `SettingsV2` (row), `AppDelegate.loadMainUserView`.
4. Android screens `ui/customers/v2/*` and `ui/onboarding/OnboardingV2Screen.kt`; wire in `CartV2Screen`,
   `AnyRentNavHost` (Customers route, new detail route, Onboarding route). `CustomerFormScreen` gets `allowDelete`.
5. Strings: iOS vi/en `Localizable.strings`, Android `values`/`values-vi`.
6. Verify: unit tests + builds, manual run against a local API with screenshots, flags on/off, merchant and staff.

## Risks

- Flag-off paths must not change: the swaps are single `if` branches at the entry points.
- String/pbxproj conflicts with phase 5 (#386): union-resolve at merge.

## Rollback

Revert the PR, or switch `newCustomers` / `newAuth` off server-side.
