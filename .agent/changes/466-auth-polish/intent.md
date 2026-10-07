# Polish the new auth screens (kiểu 4A)

Issue: #466 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-05

## Problem

The pre-login screens behind `newAuth` (on by default since #457) look raw. Login is a white page with three
drifting blobs, and the "logo" is really the blue blob. The fields are bare, and a large empty band separates the form
from "Chưa có cửa hàng? Tạo cửa hàng mới" at the bottom. Every merchant and staff member sees this screen on every
sign-in. Owner, 2026-10-05: "UI login, register và forgot nó hơi raw nên nâng cấp chút". The owner also said
"đừng làm quá", so this is a polish, not a redesign.

## Proposed outcome

All pre-login screens follow the owner's chosen style, "Kiểu 4A". The boards are on the design canvas
https://claude.ai/artifact/DY4DRyDH8Kps9gAw9FExLx, row "Bộ màn trước đăng nhập — kiểu 4A": DX-Dang-nhap,
DX-Tao-cua-hang-1, DX-Tao-cua-hang-2, DX-Quen-mat-khau, DX-Da-gui and DX-Gioi-thieu.

- White page. A light dot grid covers the top ~420pt and fades out. No blobs, no motion.
- The real brand mark with the "AnyRent" wordmark: 72pt centred on login, and a 32pt top bar on the other screens.
- Fields with a leading icon, a blue focus border and ring, and the existing inline error under the field.
- Full-width primary button with a spinner while loading. The secondary link sits right under the form.
- Titles are 28pt everywhere. The "check your email" screen has a light-blue mail tile.
- Onboarding v2 keeps its content and gets the dot header, a small logo top-left and "Bỏ qua" top-right.

iOS is the reference, and Android matches it.

## Affected users and systems

Everyone who signs in or creates a shop on iOS and Android with `newAuth` on: `MERCHANT`, `OUTLET_ADMIN` and
`OUTLET_STAFF`. No API, data or web change.

## Constraints

- Same calls (mobile login and refresh from #454, register, forgot, resend), validation (`AuthForms.swift` /
  `domain/auth`), error placement and analytics.
- The old flag-off screens (`LoginViewController`, `AuthScreens.kt`, `OnboardingViewController`) are unchanged.
- The keyboard never covers the primary button (#448 / #461).
- No new screens, fields or social login. New strings only where a label does not exist yet.

## Open questions

- None. The design was approved on the canvas before coding.

## Decision log

- 2026-10-05: polish only, lean ("đừng làm quá") (owner)
- 2026-10-05: design "Kiểu 4A" chosen on the canvas; implement it on iOS first, Android to match (owner)
- 2026-10-05: forgot password keeps the existing staff note at the bottom. The board does not show it, but removing
  help text is a content change, not polish (Claude)
