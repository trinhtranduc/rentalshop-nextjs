# Plan — Five photos per order note

Issue: #435 · Status: in progress · Spec: ./spec.md

Base branch `dev`, branch `feat/435-note-images-limit`, one PR into `dev`.

## Steps

1. `packages/constants/src/validation.ts`: `MAX_ORDER_NOTE_IMAGES: 5`.
2. `apps/api/lib/image-compression.ts`: `noteImageCount`, `exceedsNoteImageLimit`, `bodyExceedsNoteImageLimit`.
3. `apps/api/app/api/orders/route.ts` (POST) and `[orderId]/route.ts` (PUT): check before upload/write.
4. Web `OrderSettingsCard.tsx`: limit 5, compress with `compressImage` (0.18 MB, 1920px).
5. iOS `NoteViewController.swift` (limit 5), `PreviewViewController.swift` (`compressedNoteJPEG`, 180KB).
   Android `FullScreenImagePreview.kt` (limit 5), `ImageUploadUtils.kt` (comment).
6. `docs/API_ORDER_NOTES_IMAGES.md`: section 4.
7. Tests; mocks of `image-compression` keep the real helpers (`jest.requireActual`).

## Verify

```bash
cd tests && npx jest api/
npx tsc --noEmit -p apps/api/tsconfig.json   # no error on changed lines
cd apps/mobile && xcodebuild ... build
cd apps/mobile-android && ./gradlew :app:assembleDebug
```
Manual on dev-api: add 5 photos on web/iOS/Android; a 6th is not offered; edit keeps 5.

## Rollback

Revert the PR. Installed apps are unaffected either way.
