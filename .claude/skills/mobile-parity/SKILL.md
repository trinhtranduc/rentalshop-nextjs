---
name: mobile-parity
description: Use when an API response shape, endpoint, permission rule or order/availability business rule changes, or when a feature lands in only one mobile app. Keeps iOS (apps/mobile) and Android (apps/mobile-android) in parity with the API and with each other.
---

# iOS ↔ Android ↔ API parity

Parity rule (from `apps/mobile-android/IOS_PARITY_GAP_PLAN.md`): both apps deliver the same business
outcome, permissions, validation, error handling and destructive-action confirmations. UI may differ.

1. **Classify the change:** (a) response shape or new field, (b) new endpoint, (c) permission or role rule,
   (d) business rule (availability, pricing, order status, day boundaries). Each has a mobile consequence.
2. **Backward compatibility first.** Mobile clients in the field cannot be force-updated. New JSON fields
   are optional; never rename or remove a field without a deprecation period. Keep `limit` ≤ 500.
3. **iOS:** `Codable` decoders in `apps/mobile/POS ADBD/Library/Services/APIResponse.swift` and per-domain
   services (`OrderService.swift`, `ProductService.swift`, …); endpoints in `APIEndpoint.swift`. New optional
   fields → optional properties. Strings → `en.lproj` and `vi-VN.lproj/Localizable.strings`.
4. **Android:** OkHttp client in `data/ApiClient.kt` (core) and `data/ApiParity.kt` (iOS-parity extras), models
   in `data/model/`, permission helpers in `data/PermissionManager.kt`. Strings → `res/values/strings.xml` and
   `res/values-vi/strings.xml`.
5. **Permissions:** mobile helpers only hide controls; the API must also reject the action. Update both.
6. **Dates:** day math on both platforms uses `Asia/Ho_Chi_Minh` (see `timezone-dates`, rule 8).
7. **Error codes:** apply `i18n-keys` step 5 for any new code the apps can receive.
8. **Verify builds:** iOS `xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' build`,
   Android `./gradlew :app:assembleDebug`. Both must succeed before the PR is "done".
9. **Record gaps:** if one platform cannot be updated in this PR, add an entry to
   `apps/mobile-android/ANDROID_PARITY_REAUDIT_2026-07-31.md` or a new `intent/` file, and say so in the PR body.
10. **Store releases** (TestFlight lane, Play bundle) are blocked by `production-gate.sh`; never run them
    without a human go.
