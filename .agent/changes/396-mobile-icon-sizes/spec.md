# Spec — Mobile icon sizes and style match the boards

Issue: #396 · Status: accepted · Intent: ./intent.md

## Behavior

1. iOS `DS.Icon.sm/md/lg` are 18/20/22 and `DS.symbolPointSize(for:)` returns `size × DS.Icon.pointFactor`.
2. iOS `DS.symbol(name, size)` returns an SF Symbol configured with that point size and weight `.medium`
   (closest stroke to the board's 2px line at these sizes).
3. Android `DS.Icon.Sm/Md/Lg` are 18/20/22 dp; `AppIcon` draws an `ImageVector` at a token size.
4. Android new screens use `Icons.Outlined.*` / `Icons.AutoMirrored.Outlined.*` only; the scan button uses a
   barcode glyph (board path), not `QrCodeScanner`.
5. Each icon on the new screens has the size its board gives (table in `plan.md`); an icon without a size is gone.
6. With the flags off the old screens render as before (shared components keep their defaults).

## Out of scope

- Layout changes, colors, tab bar icons, login/onboarding screens (`newAuth`, `newCustomers` are not built yet).
- Editing the canvas; the rule is written here for the owner to copy.

## API and data

None.

## Acceptance

- [x] Unit test for the iOS point-size mapping and the Android tokens
- [x] Screenshots of each new screen next to its board under the scratch `compare/` folder
- [x] Old screens checked with the flags off
- [x] No new user-facing strings
