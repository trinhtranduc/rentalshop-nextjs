# Spec — Settings detail pages in the new UI style

Issue: #459 · Status: accepted · Intent: ./intent.md

## Rows (before → after)

| Settings v2 row | iOS before | iOS after (flag on) | Android before | Android after (flag on) |
|---|---|---|---|---|
| Thông tin cửa hàng | `AccountViewController`: old custom nav bar, inset-grouped value1 table, "Sửa" text button | same VC with `v2 = true`: v2 header (‹ + 20pt title, "Sửa" text button), grey band + title/value rows, thin dividers | `StoreInfoScreen`: Material TopAppBar (×), AppCard + AppInputField form, AppPrimaryButton | same composable with `v2 = true`: v2 header, profile block, band, v2 form fields, v2 primary button |
| In hóa đơn / Máy in | `PrinterConfigurationViewController`: old nav bar, white card with right-aligned IP row + note, two RCPrimaryButtons | `v2 = true`: v2 header, labelled v2 fields (IP, note), hint/support text, bottom bar Kiểm tra máy in (secondary) + Lưu (primary) | `PrinterNetworkScreen`: TopAppBar, AppCard + 5 AppInputFields, AppSecondary/AppPrimary buttons | `v2 = true`: v2 header, v2 fields, v2 secondary + primary buttons |
| Người dùng | `UserManagementViewController`: old nav bar, UISearchBar, card `UserCell`s with ⋯ menu | `v2 = true`: v2 header (‹ title, + only with `canManageUsers`), v2 search box, flat rows (avatar, name + status pill, email · role, ⋯ menu) | `UserManagementScreen`: TopAppBar (+), AppCard rows | `v2 = true`: v2 header (+), flat rows with avatar, status pill, same overflow menu |
| ↳ Thêm / sửa người dùng | `UserFormViewController`: old nav bar (×), card of right-aligned fields, RCPrimaryButton | `v2 = true`: v2 header, labelled v2 fields (Vai trò / Cửa hàng as tappable fields with chevron), v2 primary button | `UserFormScreen`: TopAppBar (×), AppCard + AppInputFields, chips, Switch | `v2 = true`: v2 header, v2 fields, v2 segmented role, switch row, v2 primary button |
| Xuất dữ liệu | `ExportViewController`: old nav bar with "Xuất" text button, inset-grouped checkmark table | `v2 = true`: v2 header, bands + flat rows with primary checkmarks, bottom v2 primary button "Xuất" | `ExportAuthScreen`: TopAppBar with "Xuất" text action, SectionLabel + rounded cards | `v2 = true`: v2 header, bands + flat rows, bottom v2 primary button |
| Thông tin ứng dụng | `AppInformationViewController`: old nav bar, inset-grouped value1 table | `v2 = true`: v2 header, bands + rows (value, chevron on links) | `AppInfoScreen`: CenterAlignedTopAppBar, SectionLabel + AppCard | `v2 = true`: v2 header, bands + rows |

| ↳ Sửa cửa hàng (follow-up) | `EditStoreViewController`: old nav bar (×), right-aligned card rows, RCPrimaryButton | `v2 = true` (passed on from store info): ‹ header, labelled fields (Quốc gia opens the country picker), error under the name field, v2 primary "Cập nhật cửa hàng" | none: `StoreInfoScreen` is itself the edit form (restyled above) | n/a |

Follow-up (owner, 2026-10-05): with `newSettings` on, the detail pages opened from Settings v2 hide the bottom
tab bar (iOS `hidesBottomBarWhenPushed`, like Khách hàng); bottom buttons sit on the safe-area bottom.
Android already shows no bottom navigation there: these are root destinations outside the tab scaffold,
the same as the v2 customer list, so nothing changes on Android.

Khách hàng already opens the v2 customer list; Ngôn ngữ / Đổi mật khẩu / Xóa tài khoản are system settings
or alerts and are not changed.

## Behavior

1. With `newSettings` on, each row above opens its page in the v2 style listed in the table (iOS and Android).
2. With `newSettings` off, the old Settings and every page it opens look and behave exactly as before.
3. Same data and actions per page as today: store fields and link copy; printer save / test print and IP
   validation; users list, search, edit, change password, enable/disable, delete, add; user form fields per
   role, validation and API payload; export selections, custom range checks (≤ 365 days), the same export
   API calls and share sheet; app info links.
4. Permissions unchanged: "Sửa" on store info only with `canManageOutlets` (iOS) / fields read-only without
   `canManageStore` (Android); "+" on users only with `canManageUsers` (iOS, as today); Settings v2 still
   decides who sees each row.
5. With `newSettings` on, no tab bar on these pages (iOS); Android unchanged (already none).
6. Text sizes only from the #424 ramp (24/20 headings, 17 · 16 · 15 · 14 · 12); colours from the tokens.

## Out of scope

- New rows, new actions, new screens, API or string changes.
- Bank account screens, subscription screen.
- Order-row files of the parallel change.

## API and data

None.

## Acceptance

- [x] iOS Development build and `POS ADBDTests` pass (168 tests)
- [x] Android `:app:testDebugUnitTest :app:assembleDebug` pass (249 tests)
- [x] Before/after screenshots of each iOS page (spare iPhone 17 simulator, local API)
- [x] No new user-facing strings (i18n-keys not needed)
