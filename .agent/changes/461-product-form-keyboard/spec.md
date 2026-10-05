# Spec — Number pad covers "Lưu sản phẩm" in the new product form

Issue: #461 · Status: accepted · Intent: ./intent.md

## Behavior

1. iOS product form: every `.numberPad` field ("Thuê theo lần", "Thuê theo ngày", "Giá bán", "Cọc mỗi món")
   has an input accessory toolbar whose last item is "Done".localized() ("Xong") and ends editing on that field.
2. iOS product form: the save button's bottom is tied to `view.keyboardLayoutGuide.top`, so it sits on the
   keyboard while it is up and on the safe area otherwise (same position as before when no keyboard).
3. iOS product form: when the keyboard shows or a field starts editing, the focused field's box is scrolled
   into view inside the form. IQKeyboardManager is disabled while the form is on screen and restored after.
4. iOS: typing "3" then "0" into an empty price field gives "30"; "30000" gives "30.000" (guard for the
   Maestro "300" report).
5. iOS other new-UI numeric inputs get the same Done bar: hand-over security deposit, return late fee and
   damage fee (`OrderHandOverSheetViewController`), extend extra rent (`OrderExtendSheetViewController`),
   phone in new / edit customer (`.phonePad`). Their confirm buttons already ride on the keyboard or sit
   in a scroll view, so only the Done bar is added.
6. Android product form: `imePadding()` applies to the whole screen column, so the save bar sits above the
   keyboard; the scrolling column no longer pads itself. The form lives in a full-screen dialog window
   (`AppFormSheet(fullScreen = true)`), so it also sets that window to `SOFT_INPUT_ADJUST_RESIZE` while shown
   (restored on dispose; no-op outside a dialog). Numeric fields use `ImeAction.Done`, which clears
   focus (closes the keyboard).
7. Android: the money formatter turns keystrokes "3", "30", "30000" into "3", "30", "30.000".

## Checked, not affected

- Cart discount / deposit (both apps): custom number pad sheet (`NumberPickerViewController`,
  `AppNumericPadSheet`), no system keyboard.
- Product stock (both apps): stepper, no text input.
- Android hand-over / return / extend sheets: Material 3 `ModalBottomSheet` pads its content for the IME,
  and single-line number fields already show a Done key that closes the keyboard.
- Android new / edit customer: screen already has `imePadding()`, phone uses `ImeAction.Next`.

## Out of scope

- Previous/next arrows on the toolbar.
- Old (flag-off) screens, Settings screens, order rows and overview lists.
- Any API, money or permission rule.

## API and data

None.

## Acceptance

- [x] Each behavior line has a test, a command, or a UI check named in `plan.md`
- [x] iOS and Android called out (UI only, no API shape or rule change)
- [x] No new user-facing strings (reuses "Done" / "Xong" in `Localizable.strings`)
- [x] Role limits unchanged (prices still hidden for `OUTLET_STAFF`)
