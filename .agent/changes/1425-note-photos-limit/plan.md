# Plan #1425

1. Tests first: `tests/web-note-photo-limit.test.ts`, iOS `OrderDetailLogicTests`, `NotificationsNotesV2Tests`, Android `OrderDetailLogicTest`, `NotificationsLogicTest`.
2. Web: one constant in `orders/detail/actions-model.ts`, used by `settings.tsx` and `create/OrderEditor.tsx`.
3. iOS: `maxNotePhotos`, `notesPlan`, `countLabel`. Android: `MAX_NOTE_PHOTOS`, `notesPlan`, `MAX_NOTE_IMAGES` follows it, no cut on display, label.
4. Verify: jest, lint, type-check, `POS ADBDTests`, `testDebugUnitTest`, `assembleDebug`; UI with an order holding 5 photos.
