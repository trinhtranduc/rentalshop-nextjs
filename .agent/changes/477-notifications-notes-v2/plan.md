# Plan — Notifications and order note editor in the new design

Issue: #477 · Status: accepted · Spec: ./spec.md

## Steps

1. Logic + tests (both apps):
   - iOS `ViewModels/NotificationsLogic.swift`: `kind(type:status:)`, `rowStyle(isRead:)`, `groups(_:now:)`,
     `dayTitle`, `time`; `NoteEditorLogic` (count label, can add, remaining slots, short code).
     Tests `POS ADBDTests/NotificationsNotesV2Tests.swift`.
   - Android `domain/notifications/NotificationsLogic.kt` (also `NoteEditorLogic`).
     Tests `test/.../domain/notifications/NotificationsLogicTest.kt`.
2. iOS inbox: `NotificationsViewController` gets `v2` (default `newProducts`); new header, chips, sections,
   `NotificationV2Cell`, empty state. Old path untouched.
3. iOS editor: rebuild `OrderNotesEditorViewController` (full screen, new field, tiles, pinned save, Done bar);
   `NoteImagePreviewViewController` made internal for reuse. `OrderDetailViewController.editNotesTapped`
   passes the order number and presents full screen; `saveNotes` uses the ~180KB compression.
   Cart: `CartV2ViewController.editNote` body → `OrderNotesEditorViewController.presentCartNote(from:)`.
4. Android inbox: `InboxV2Screen` in `ui/inbox/`; nav picks it when `NEW_PRODUCTS` is on.
   `ApiClient.getNotifications` gets optional `isRead`.
5. Android editor: `NoteEditorV2` full-screen dialog in `ui/orders/v2/`; `OrderDetailV2Screen` uses it instead
   of `NotesSheet`. Cart: `CartV2Screen` note dialog → `NoteEditorV2` (text only).
6. Strings vi + en (iOS `Localizable.strings`, Android `strings.xml`).
7. Verify: iOS build + POS ADBDTests on a spare simulator; Android `:app:testDebugUnitTest :app:assembleDebug`.

## Files

- iOS: `ViewModels/NotificationsLogic.swift` (new), `Views/NotificationV2Cell.swift` (new),
  `Viewcontrollers/Notifications/NotificationsViewController.swift`,
  `Viewcontrollers/OrderDetail/OrderNotesEditorViewController.swift`,
  `Viewcontrollers/OrderDetail/OrderDetailViewController.swift`, `Viewcontrollers/Tabbar/NoteViewController.swift`
  (one word), `Viewcontrollers/Products/v2/CartV2ViewController.swift` (note opener only), `*.lproj`, project file.
- Android: `domain/notifications/NotificationsLogic.kt`, `data/model/Models.kt` (optional `status`),
  `ui/inbox/InboxV2Screen.kt`, `ui/orders/v2/NoteEditorV2.kt` (new), `ui/orders/v2/OrderDetailV2Screen.kt`,
  `ui/orders/v2/OrderDetailV2Sheets.kt` (old `NotesSheet` removed, replaced by `NoteEditorV2`),
  `ui/home/v2/CartV2Screen.kt` (note opener only), `ui/navigation/AnyRentNavHost.kt`, `data/ApiClient.kt`,
  `res/values{,-vi}/strings.xml`.

## Risks

- Conflict with the cart branch (#473) in `CartV2ViewController` / `CartV2Screen`: kept to the note opener.

## Rollback

Revert the PR. Flag `newProducts` off also restores the old inbox.
