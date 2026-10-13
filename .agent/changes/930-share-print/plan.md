# Plan — #930

1. Tests first (commit failing): iOS `OrderShareImageTests`, `ChangeHistoryTests` (sheet); Android
   `OrderShareModelTest`, `OrderActionSheetTest`.
2. iOS: `OrderShareImage.swift` (item note, created line, pill only on draft, strip days only on draft, rent totals,
   QR without amount, drop the unused amount due), `OrderShareRenderer.swift` (no pill, arrow, smaller number, item
   notes), `OrderDetailLogic.bottomButtons`, `OrderDetailViewController` (bar "In", sheet rows without icons),
   strings `share.kind.created`, `order.print.short` (append).
3. Android: same in `OrderShareModel`, `OrderShareRenderer`, `OrderActionSheet` (+ order), `OrderDetailV2Screen`
   bottom bar, `OrderActionsSheet` (no icons), strings vi/en.
4. Verify: unit tests both apps, builds, exports on Simulator / emulator vs mockups.
5. Update ../640-share-image/spec.md. PR into dev, API unchanged.
