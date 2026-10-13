# Spec — Four ready-made shift templates per branch

Issue: #959 · Status: approved · Intent: ./intent.md

## Behavior

1. `GET /api/attendance/shift-templates?outletId=` first calls `db.attendance.seedDefaultTemplates(outletId, merchantId)`,
   then lists as before (same response shape, same order rule).
2. The seed reads `AttendanceSetting.templatesSeededAt`. Set → nothing happens.
3. Not set: create the setting row if missing, then in one transaction set `templatesSeededAt = now()` only where it is
   still null. If that update touched no row (another request won), stop.
4. Inside that transaction: when the branch has no template, create the four (table below). When it has one or more,
   create none (only the mark is written).
5. Templates: `Ca sáng` 08:00–12:00 break 0 `blue`; `Ca chiều` 13:00–17:00 break 0 `orange`; `Ca tối` 18:00–22:00
   break 0 `purple`; `Hành chính` 08:00–17:00 break 60 `green`; all `isActive: true`. Names are shop data (Vietnamese).
6. Deleting every template later never re-creates them (the mark stays).
7. Parallel first loads create exactly four (row lock on the conditional update; a racing insert of the setting row
   is tolerated, P2002).
8. Other routes (POST / PATCH / DELETE templates, settings, shifts) do not seed.

## Acceptance

- Route unit test (TZ=UTC and TZ=Asia/Ho_Chi_Minh): GET seeds for the resolved outlet and caller merchant before listing;
  a forbidden outlet does not seed.
- DB unit test: mark set → no write; mark claimed + empty → four rows; claimed + existing → none; claim lost → none.
- Business e2e: new branch sees the four; delete all → GET returns none; parallel first loads on a new branch → exactly
  four; a branch with a template before the first GET gets none and its mark is set.
