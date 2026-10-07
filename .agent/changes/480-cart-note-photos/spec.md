# Spec — Cart note editor: tab bar and photos

Issue: #480 · Status: accepted · Intent: ./intent.md

1. iOS: closing the note editor (X or "Lưu ghi chú") from the cart leaves the tab bar hidden. Same presentation
   from the order detail.
2. Cart (new order, not edit mode) note editor shows "Ảnh", "N/5 ảnh", tiles and "Thêm" (both apps).
3. Saved photos are kept by the cart, at most 5, iOS as ~180KB JPEG data, Android as cache files compressed to
   ~180KB at create (`fileToNotesJpegBytes`). Reopening the editor shows them; removing one and saving drops it;
   closing with X keeps the previous set.
4. `resetCart` / `CartStore.clear` (successful create, clear cart, logout) empties the photos.
5. Create from the confirm sheet sends the photos as multipart parts named `notesImages`
   (`notes_image_<i>.jpg`, `image/jpeg`) next to the `data` JSON. No photos: iOS sends the same multipart request
   as today with no file parts; Android sends the same JSON body as today.
6. Edit mode: text only, as before.

## Out of scope

- Persisting photos across app restarts. The old create preview (`PreviewViewController`) and old Android checkout.

## Acceptance

- [x] Tests first: cart photo state (cap 5, reset clears, not in the disk snapshot) and the create payload parts (both apps)
- [x] iOS build + POS ADBDTests on a spare simulator; Android `:app:testDebugUnitTest :app:assembleDebug`
