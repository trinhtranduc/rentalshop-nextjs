# Spec — #935

1. `AttendanceLogic.weekRows` builds one line per record:
   - closed record: `"09:57–16:00 · 6,1 g"`; late adds `" · muộn 117′"` (late never replaces the hours)
   - open record: `"09:57–…"`, plus `" · muộn N′"` when late
   - `AttendanceWeekRow.worked` stays the full text (lines joined by `\n`, also the accessibility label);
     new `lines: [AttendanceWeekLine]` holds each line's main text and its late text (nil when on time).
2. `MyShiftsViewController.renderWeek` draws the main text in the normal colour and only the late part
   in amber (`#92400E`).

API: không đổi. Android: already done in #933.
