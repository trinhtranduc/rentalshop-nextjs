# Number pad covers "Lưu sản phẩm" in the new product form

Issue: #461 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

New product form (flag `newProducts`, Home → "Thêm sản phẩm"):

- **iOS** (`ProductFormViewController`): the price fields use `.numberPad`. The pad covers the pinned
  "Lưu sản phẩm" bar and has no Done/return key, so the keyboard closes only by tapping empty space or
  dragging the form. IQKeyboardManager (enabled app-wide) lifts the focused field but leaves the save bar
  under the keyboard.
- **Android** (`ProductFormV2Screen`): `imePadding()` sits on the scrolling column, not on the screen, so
  with edge-to-edge the save bar below that column stays under the keyboard.
- A Maestro run typed "30" into "Thuê theo ngày" and the field showed "300".

## Finding on "300"

Not a formatting bug. Maestro log `~/.maestro/tests/2026-10-05_152022`:

1. `inputText "30"` → screenshot `p3-filled` shows "30" in "Thuê theo ngày".
2. `tapOn "Lưu sản phẩm"` → Maestro taps the element's bounds (220, 888) from the accessibility tree. The
   number pad covers the button there, and that point is the pad's "0" key.
3. Screenshot `p4-saved` shows "300", the form did not save.

So "300" is a side effect of the covered save button. A typing test (`insertText` "3", "0" into the real
field) gives "30" on iOS; the Android formatter test gives the same. Fixing the covered button removes it.

## Proposed outcome

- iOS numeric fields in the new UI carry a "Xong"/"Done" bar above the keyboard that ends editing.
- iOS product form: the save bar rides on the keyboard (`keyboardLayoutGuide`), the form scrolls the
  focused field into view, IQKeyboardManager is off on this screen (same as the new customer screens).
- Android product form: the whole screen gets `imePadding()`, so the save bar sits above the keyboard;
  numeric fields have IME action Done that clears focus.
- Same check on the other new-UI numeric inputs; fix where the keyboard cannot be dismissed or hides the
  confirm button.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN` (price fields), every role for stock and other sheets. iOS and Android only.
No API, data or business-rule change.

## Constraints

- No API change; prices stay hidden for `OUTLET_STAFF`.
- Do not touch order rows/overview lists or Settings detail screens (parallel work).
- Old (flag-off) screens unchanged.

## Open questions

- None blocking.

## Decision log

- 2026-10-05 — "300" classified as automation side effect, with Maestro log + screenshots as evidence; no
  formatter change, guard tests added instead (agent).
- 2026-10-05 — Done bar only ("Xong"), no previous/next arrows: keep it lean (agent).
