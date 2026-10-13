# #923 Spec

## Data (origin/dev, unchanged)
`GET /api/attendance/people/[userId]/month` rows carry no per-record `hours`. Scan and AUTO_CLOSED rows of a record
carry its shift snapshot (`shift.breakMinutes`). A manual record ("+ Thêm lượt") has only EDIT rows; `after` is
`{ checkInAt, checkOutAt, status, dateKey, id }`, no shift. The server stores the shift it linked when the record was
added (`matchShiftForInstant`: a shift of the record's day whose window `[start − 3 h, end]` holds the check-in,
closest start wins; cross-midnight end is the next day) and counts `(OUT − IN) − break`, floor 0.

## Rule: hours of one record (both apps)
1. The API's `hours` when a row or `after` carries it (none today; kept for a later API).
2. Else `(OUT − IN) − break`, floor 0, where break is the record's own snapshot from its rows
   (any scan / AUTO_CLOSED row's `shift.breakMinutes`).
3. A record with no snapshot in the rows (manual add): the break of the shift the server linked, found on the
   record's day in the schedule the screen already loads, by the server's window rule. No shift → 0.

## Android week row
Left: day, shift names on one line each (no wrap). Right: one line per record, like iOS:
`08:03–16:58 · 7,9 g`, `08:07–12:00 · muộn 7′` (amber), open `08:03–…`, missing out `08:03–?`.

## Copy (Android = iOS)
| key | vi | en |
|---|---|---|
| attendance_no_shift | Không có ca hôm nay | No shift today |
| attendance_week_empty | Chưa có ca tuần này | No shifts this week |
| attendance_err_other | Không chấm công được | Could not clock in / out |
| attendance_err_wrong_outlet_msg_plain | Quét mã của chi nhánh bạn làm việc. | Scan the code of the outlet you work at. |
| attendance_open_settings | Mở Cài đặt | Open Settings |
| settings row, no shift today | Chưa vào ca (first letter capital) | Not clocked in |
| role_outlet_staff (vi) | Nhân viên cửa hàng | Outlet Staff |

## iOS test
Encode with `outputFormatting = .sortedKeys` before comparing bytes.

## API
No change. No `.agent/api-changes/LOG.md` row (mobile only).
