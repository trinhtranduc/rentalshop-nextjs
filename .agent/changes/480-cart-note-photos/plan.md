# Plan — Cart note editor: tab bar and photos

Issue: #480 · Status: accepted · Spec: ./spec.md

1. Tests (red), committed alone:
   - iOS `POS ADBDTests/CartNotePhotosTests.swift`: `CartStore.setNoteImageData` caps at 5, `resetCart` clears,
     `replaceCart` clears, snapshot has no photos; `OrderService.notesImageParts` names/files/mime.
   - Android `test/.../data/CartNotePhotosTest.kt`: `CartStore.setNoteImageFiles` caps at 5, `clear` empties;
     `ApiClient.createOrderBody` JSON without photos, multipart `data` + `notesImages` parts with photos.
2. iOS: `CartStore.noteImageData`; `OrderService.notesImageParts` used by `uploadOrderRequest`;
   `NoteEditorLogic.compressedJPEG`; editor `newImages` + `.overFullScreen`; `presentCartNote` with photos;
   `CartV2ViewController.submitOrder` calls `createOrder(from:notesImages:idempotencyKey:)`.
3. Android: `CartStore.noteImageFiles`; `ApiClient.createOrder(noteImages)` + `createOrderBody`;
   `CartOrderSubmit.create(key, noteImages)`; `CartV2Screen` picker + editor photos + create passes bytes.
4. Verify: iOS build + POS ADBDTests (spare simulator), Android `:app:testDebugUnitTest :app:assembleDebug`.
