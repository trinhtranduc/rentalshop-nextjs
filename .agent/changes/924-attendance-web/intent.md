# #924 Attendance web fixes + api-local busy port — intent

**Issue:** #924 (found by the final e2e of the Chấm công module on `dev` `dab1050aa`, Refs #906). Owner approved 2026-10-13.

## What and why
1. Excel "Lịch sử sửa": "Người sửa" shows an id when the shop owner edited; "Trước" shows " – " for a new record.
2. Chi tiết theo người: the "Đã sửa" row shows only the reason; the mockup shows who and the times.
3. Admin Module card: pills read "Đang Bật", "Chưa Có" (CSS capitalises every word).
4. Sửa công dialog: an out time at or before the in time is saved as the next day, with no hint.
5. `scripts/mobile-e2e/api-local.sh start` says "healthy" when another process owns the port, so two
   agents wrote into each other's database.

## Constraints
- API additive only: `editorName` on EDIT rows of `GET /api/attendance/people/[userId]/month`.
- New strings in all 5 locales. VN civil days. Keep it simple; no new screens. Mobile apps untouched (#923).
- Script stays bash-3 compatible (macOS).
