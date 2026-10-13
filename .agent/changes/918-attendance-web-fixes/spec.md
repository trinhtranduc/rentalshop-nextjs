# #918 spec

## API (additive)
1. `GET /api/attendance/people/[userId]/month` — every row gets `dateKey` (`YYYY-MM-DD`):
   - a scan linked to a record of the month, the auto-close row and an edit row → the record's `dateKey`;
   - any other scan (rejected, or its record is outside the month) → VN civil day of `at`.
   No other field changes; `at` keeps its meaning (an edit row's `at` is still the edit time).
2. `SHIFT_LOCKED` (409) from `POST /shift-rules`, `PUT /shift-rules/[id]`, `POST /shift-rules/[id]/stop`,
   `PUT|DELETE /shifts/day` adds `data`:
   `{ users: [{ id, name }], dates: [date], messageParams?: { names } }`.
   - `date` before today → `users` = every user the check was given (stop passes none), `dates: [date]`.
   - `date` = today and some users already worked today → `users` = those users only, `dates: [today]`.
   - `messageParams.names` ("Lan, Hoa") only when `users` is not empty, for the web toast.
   `code`, `message`, status unchanged.
3. Export "Chi tiết": column Loại `Vào` / `Ra`; Kết quả `Ghi nhận` or `Từ chối · <lý do>`
   (Ngoài vùng, GPS chưa chính xác, Vị trí giả, Mã QR hết hiệu lực, Mã QR của chi nhánh khác,
   Chi nhánh chưa cài vị trí; unknown code → `Từ chối · <code>`).

## Web (client)
1. Chi tiết theo người groups rows by `row.dateKey` (fallback: the record's IN day, then VN day of `at`).
   An edit row under another day shows `dd/MM HH:mm` of the edit.
2. One "Sửa" button per record (first row of the record in the day), any status, when the month is open and
   the caller may edit that person. The dialog takes the record's current in / out from its last edit's
   `after`, else from its IN / OUT scans.
3. Gán ca: start date defaults to tomorrow. A `SHIFT_LOCKED` with names shows
   "{names} đã chấm công hôm nay nên không đổi ca hôm nay được. Chọn ngày bắt đầu từ ngày mai."
   (`errors.SHIFT_LOCKED_NAMED`; the toast uses `<CODE>_NAMED` when `messageParams.names` is present).
4. Xếp ca: today's cell of a person with a record today (timesheet day cell) shows 🔒 and opens the locked
   dialog; no "+".
5. Outlet picker default: the outlet with `isDefault`, else the first.
6. See API 3.

## Out of scope
Error toast title / auto-hide (#919). Mobile apps (#916).
