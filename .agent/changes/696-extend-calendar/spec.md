# Spec (#696)

1. The Gia hạn sheet shows the cart's calendar (iOS `DatePickerViewController` embedded; Android `AppRangeCalendar`, the cart's `DateRangePicker`).
2. It opens with pickup → first day after the current return selected; the pickup day is drawn as selected.
3. Days up to the current return cannot be picked.
4. A tap on a later day makes it the new return day; the pickup never moves. On iOS, a tap on a shaded later day shortens the extension to that day.
5. "Thêm N ngày", the button "Gia hạn đến <day>", the availability check and the saved `returnPlanAt` (end of the shop day) are unchanged.
6. iOS colours: pickup black, rented days grey, added days light blue, new return blue. Android: the Material range uses one shade; rented days have muted text.

Out of scope: the cart picker itself, the order-edit dates.
