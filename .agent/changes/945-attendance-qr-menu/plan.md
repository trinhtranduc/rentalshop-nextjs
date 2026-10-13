# #945 Plan

Status: done

1. Tests first (commit): `tests/web-attendance-locations.test.ts`: tab list and visibility by role / module,
   active tab, location hrefs, row view (QR status, radius), old page redirects, `/outlets` page has no attendance.
2. Model: `attendanceTabs`, `isAttendanceTabActive`, `locationRow` in `attendance-model.ts`; hrefs in
   `attendance/locations/hrefs.ts` (no imports, usable from a server page).
3. Move `outlets/[id]/attendance/{page,MembersCard}.tsx` → `attendance/locations/[id]/`; back link to the list;
   tab strip on top. Old path becomes a server `redirect()`.
4. New list page `attendance/locations/page.tsx` inside `AttendanceFrame`.
5. Remove the attendance column and button from `outlets/page.tsx`.
6. i18n (`i18n-keys`): `attendance.tabs.locations`, `attendance.locations.*` in en/vi/ja/ko/zh.
7. Verify: tests, tsc client vs origin/dev, lint changed files, client build, headed Chrome as MERCHANT and
   OUTLET_ADMIN against a local API on DB `anyrent_945`.
