# #918 Attendance web fixes — intent

**Issue:** #918 (found by the web e2e of #906 / PR #917). Owner approved 2026-10-12.

## What and why
Six problems an owner hits on the web Chấm công screens:
1. Chi tiết theo người puts manual records and edits under the day of the edit, not the work day.
2. Only the "Tự đóng" row has a "Sửa" button; normal and manual records cannot be edited on the web.
3. Gán ca starts today by default; one person who already worked today makes the whole save fail with a
   `SHIFT_LOCKED` toast that does not say who.
4. The "+" cell of today for a person who already worked says "chưa vào ca, sửa được"; saving fails.
5. The outlet picker defaults to the first outlet, not the shop's default outlet.
6. Excel "Chi tiết" shows raw codes (`IN`, `OUT_OF_RANGE`, `ACCEPTED`).

## Constraints
- API changes are additive only: `dateKey` on every person-month row, `data` on `SHIFT_LOCKED`.
  The iOS/Android fix (#916) reads `row.dateKey` (exact name, `YYYY-MM-DD`).
- VN civil days. New strings in all 5 locales. Keep it simple: no new screens.
