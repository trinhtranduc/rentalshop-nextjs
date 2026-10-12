# #924 spec

1. **Editor names (API).** `apps/api/lib/attendance/editors.ts` `editorNames(edits, known)` returns
   `Map<userId, name>`: names already known (timesheet users, the person) plus one `findUsersByIds` for the rest
   (the shop owner). Used by the Excel export and by the person month route.
   - Excel "Lịch sử sửa": "Người sửa" = name (id only if the user no longer exists). "Trước" = empty when the
     edit added the record (`before` null or both times null).
   - Person month: every EDIT row gets `editorName: string | null` (additive).
2. **"Đã sửa" row (web).** `editSummary(row, recordDay)` in `attendance-model.ts`:
   - added record: `Lan · vào 08:05 → ra 17:20 · "lý do"`
   - edit: changed fields show before → after: `Lan · vào 08:00 → 08:05 · ra 17:00 → 17:20 · "lý do"`;
     an unchanged field shows once.
   - an out time on a later VN day than the record day gets "(hôm sau)".
3. **Admin labels.** Module pills keep the source case: "Đang bật", "Đang tắt", "Hết hạn", "Chưa có"
   (`ar-pill-plain` = `text-transform: none`; the global capitalise for enum pills stays).
4. **"(hôm sau)".** Sửa công / Thêm lượt dialog: when out ≤ in, "(hôm sau)" next to Giờ ra. Person table: an OUT
   row on the day after its group day shows `02:00:00 (hôm sau)`.
5. **api-local.sh.** `start` fails with "Port N is already in use (pid …)" when anything listens, checked before
   the build and again right before `next start`; no `lsof` → fail clearly. After `/api/health` answers, the
   listening pid must be the started process or its child; otherwise "Port N answered but pid X is not the API
   this script started" and only our process is stopped. If our process exits while waiting, fail at once.

## Acceptance
- Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh: export sheet (owner name, empty "Trước"), person month
  `editorName`, `editSummary`, overnight helpers, admin pill class, api-local busy port + foreign listener.
- Headed Chrome screenshots of the 4 UI fixes.
