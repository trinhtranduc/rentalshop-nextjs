# #927 Spec (iOS)

Status: in-progress.

1. `AttendanceMe.required: Bool` — decoded from `required`; missing or not a bool → `true`.
2. Card shows when `AttendanceModule.isOn(merchant)` and `/me` loaded and `me.required`. Otherwise Settings is as before
   (no card, no row).
3. States (from `AttendanceLogic.state`):
   - not in: big = current shop time `HH:mm`; line = `T2 13/10 · <all today's shifts "Ca sáng 08:00–17:00", comma-joined>
     · <branch> · chưa vào ca` (parts left out when empty); button Vào ca (blue).
   - on shift: big = elapsed since the open record's check-in `H:MM`, ticking; line =
     `Đang trong ca · vào 07:58 · Ca sáng đến 17:00` (shift = record snapshot, else the day's shift the check-in
     falls in); green card (#ECFDF5 / #A7F3D0); button Ra ca (dark).
   - done: big = day total `8,1 giờ` (closed pairs of today from the month rows, server hours rule #923; falls back to
     the last punch's `todayHours`); line = `Hôm nay · 07:58–12:01, 13:00–17:05`; button Vào ca.
   - "Ca và công của tôi ›" link under the button in every state.
4. Button → camera + location permission → scanner. Success: a `✓ Đã vào ca 07:58 · Cách 11 m` /
   `✓ Đã ra ca 17:05 · 8,1 giờ` line inside the card; then `/me` (and today's pairs) reload. Failure: red box under
   the card with the existing error copy; new code `ATTENDANCE_NOT_REQUIRED` gets its own copy.
5. `AttendanceViewController` (intermediate screen) removed; the Settings row cell replaced by the card cell.
6. Strings vi + en (append only).
