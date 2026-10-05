# Plan — Polish the new auth screens (kiểu 4A)

Issue: #466 · Status: accepted · Spec: ./spec.md

## Steps

1. Before screenshots on a spare simulator (`AuthPolish-466 iPhone 17`, created for this change and deleted after it).
   A temporary UI test method, not committed, walks login → focus → empty submit → forgot → create store 1 → 2 with
   no login and no API call. Output: `scratchpad/auth-shots/before-*.png`.
2. iOS style (`Viewcontrollers/Auth/v2/AuthV2Style.swift`): drop the blobs, the blob clearance and the floating view.
   Add the 4A tokens, `AuthV2DotGrid` (dots + fade mask), the brand header (large, for login) and the brand bar
   (small, for the top bar), and the mail tile.
3. iOS components (`AuthV2Components.swift`): `AuthV2Field` gets a leading icon, a focus ring and error colours.
   `AuthV2PrimaryButton` gets a shadow and `setLoading(_:)`. `AuthV2Header` gets the logo and the back-button shadow.
   `authV2TitleBlock` is 28/36 and can be centred. `authV2Page` uses the dot grid and a fixed top inset.
   `authV2SecondaryRow` adds the "question + link" row.
4. iOS screens: `LoginV2ViewController`, `RegisterStoreV2ViewController`, `ForgotPasswordV2ViewController`,
   `EmailSentV2ViewController`, `Onboarding/OnboardingV2ViewController`. Layout and icons only, plus the button
   loading state around the existing calls.
5. Strings (`i18n-keys`, mobile part): `authv2.haveStore` and `authv2.rememberPassword` in
   `en.lproj` / `vi-VN.lproj`; `authv2_have_store` and `authv2_remember_password` in `values` / `values-vi`.
6. Android (`mobile-parity`): `ui/auth/v2/AuthV2Style.kt` (tokens, `AuthDotGrid`, brand header and bar, mail tile;
   blobs removed), `AuthV2Screens.kt` (field icon and focus ring, button shadow, page and footers), and
   `ui/onboarding/OnboardingV2Screen.kt`.
7. After screenshots, same walk: `scratchpad/auth-shots/after-*.png`.
8. Verify. One small piece of logic was extracted: Android `dotGridAlpha` (the fade of the dot grid). It has
   `AuthDotGridTest`. iOS uses a gradient mask instead, so it has no logic to test. Commands:
   - `cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' -derivedDataPath ~/Library/Developer/Xcode/DerivedData/agent-auth-polish SWIFT_PRECOMPILE_BRIDGING_HEADER=NO build`
   - `xcodebuild … -destination 'platform=iOS Simulator,id=<spare>' -only-testing:"POS ADBDTests" test`
   - `cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`
9. Clean up DerivedData, delete the spare simulator, then commit, push and open a PR into `dev`.

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Auth/v2/*.swift`: 4A look
- `apps/mobile/POS ADBD/Viewcontrollers/Onboarding/OnboardingV2ViewController.swift`: dot header, logo, no motion
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings`: 2 keys
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/auth/v2/*.kt`: 4A look
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/onboarding/OnboardingV2Screen.kt`: dot header, logo, no motion
- `apps/mobile-android/app/src/main/res/values{,-vi}/strings.xml`: 2 keys

## Risks

- Keyboard covering the button: the scroll and footer structure from #448/#461 stays, and only the top inset changes.
- The UI test selectors (`AnyRentE2ETests.test0AuthFlows`) match labels that do not change.

## Rollback

Revert the PR. UI only, with no data or API impact. `newAuth` can also be turned off remotely.

## Before / after notes

Screenshots: iOS, iPhone 17 simulator, Vietnamese. Saved as
`/private/tmp/claude-501/-Users-trinhtran-Documents-Source-Code-rentalshop-nextjs/2edc9c83-a57b-40dd-8f21-603a214e4ad2/scratchpad/auth-shots/{before,after}-*.png`
(login, login-focus, login-errors, forgot, create-store-1-empty, create-store-1, create-store-2;
after-create-store-2-top as well).

- Login. Before: two pastel blobs, a plain blue circle, a left-aligned title, bare fields, and "Tạo cửa hàng mới"
  pinned at the bottom with a large empty band above it. After: dot grid, centred 72pt brand mark with
  "AnyRent", centred title, fields with mail and lock icons, a focus ring and red error states, the button with a
  shadow, and "Chưa có cửa hàng? Tạo cửa hàng mới" right under it.
- Forgot. Before: blobs, a bare back button, and a 200pt empty top. After: top bar with back button and small
  brand, 28pt title, mail icon field, "Nhớ ra mật khẩu? Đăng nhập" under the button. The staff note stays at the bottom.
- Create store 1. Before: blobs, with the blue dot over the header. After: top bar, progress, 28pt title, icons
  (store, phone, pin), and "Đã có cửa hàng? Đăng nhập" under Tiếp tục.
- Create store 2. After: icons (person, mail, lock, lock), 28pt title, 14pt field spacing.
- Not captured, because they need an API call or a login: email sent (mail tile) and onboarding v2. They build and
  follow the same tokens.

## Owner review round 1 (2026-10-05)

- Every password and confirm-password field gets the placeholder "••••••••". It is a literal and is not translated.
- Every 4A text field has a placeholder:
  - store name "VD: Áo dài Minh Châu", phone "VD: 0901 234 567" and full name "VD: Nguyễn Văn A". These are new keys
    `authv2.{storeName,phone,fullName}.placeholder` / `authv2_{store_name,phone,full_name}_placeholder`, in en and vi.
  - address reuses `authv2.address.placeholder`.
  - step-2 email and forgot email reuse `authv2.email.placeholder` (ten@cuahang.vn).
- Login spacing: 8pt between the password field and "Quên mật khẩu?", and 16pt between that link and Đăng nhập.
  The create-store footer gap between the button and "Đã có cửa hàng?" goes from 2pt to 8pt. Forgot password was
  already spaced (14pt / 8pt).
- Screenshots: `auth-shots/after2-*.png`.

## Results (2026-10-05)

- iOS `POS ADBDTests` on the spare simulator: 174 tests, 0 failures, TEST SUCCEEDED.
- iOS generic simulator build: BUILD SUCCEEDED.
- Android `:app:testDebugUnitTest :app:assembleDebug`: BUILD SUCCESSFUL, 254 tests, 0 failures (includes
  `AuthDotGridTest`).
