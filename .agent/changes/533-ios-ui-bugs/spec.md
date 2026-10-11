# Spec

1. `NotificationV2Cell` puts no SnapKit constraint on `contentView`; the row is at least 68pt through the text stack (14 + max(40, text) + 14).
2. `ChangePasswordSheetViewController` disables IQKeyboardManager while shown, pins its scroll view to the sheet, adds the home-indicator inset as content inset and counts it in `fittingHeight()`.
3. `ProductsHomeViewModel.loadError` + `ProductsHomeEmptyState`: no rows and a failed load show the server reason and "Retry"; an alert only when rows exist.
4. Tổng quan without revenue permission keeps the `overviewNow` error and shows the same red "reason · Retry" card.

No new strings: `Retry` and the localized error message already exist (vi, en).
