# #927 Android — Spec

Status: in-progress

1. `AttendanceMe.required`: `data.required` when a Boolean, else `true`.
2. `AttendanceCard.visible(modules, me)`: module on and `me.required`; `me` not loaded / failed → hidden.
3. `AttendanceCard.state(me, todayPairs, now)`:
   - `IN_SHIFT` (open record): big = H:MM since `openRecord.checkInAt` (floor 0); line "Đang trong ca · vào HH:MM" +
     " · <shift name> đến <end>" for the shift linked to the check-in (server rule `linkedShift`), else first shift.
   - `DONE` with today's pairs: big = `pairHours` one decimal + " giờ"; line "Hôm nay · " + `pairTimes`.
   - otherwise (NOT_IN, or DONE without pairs): big = shop HH:MM now; line = day short · shifts (", ") · branch · status.
4. Button: camera + precise location (existing rationale / denied dialogs), then the full-screen scanner route.
   Outcome is handed back through `AttendanceCardStore`; success = one green line in the card
   ("✓ Đã vào ca 07:58 · Cách 11 m"), refusal = existing red box (title + message) under the card.
   New rejection `ATTENDANCE_NOT_REQUIRED` → "Bạn không cần chấm công" + message; `me` reloads (card hides).
5. After a success `me` and today's pairs reload. Today's pairs come from `people/{me}/month` (current VN month).
6. Route `attendance` becomes the scanner; `AttendanceScreen` is removed. "Ca và công của tôi" route unchanged.
