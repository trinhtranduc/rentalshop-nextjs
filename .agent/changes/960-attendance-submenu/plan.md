# #960 Plan

Status: done

1. Tests first: `tests/web-shell-nav.test.ts` (children per role / module, active child, keep query),
   `tests/web-shell-breadcrumb.test.ts` (routes → crumbs, ids, links, search shortcut);
   `tests/web-attendance-locations.test.ts` drops the tab-strip cases, asserts no page renders a strip.
2. `nav.ts`: children + helpers. `breadcrumb.ts`: `buildBreadcrumb`, `isSearchShortcut`.
3. `ShopSidebar.tsx`: collapsible group with sub-items.
4. Remove `AttendanceTabs` (parts.tsx, locations/[id]) and `attendanceTabs` / `isAttendanceTabActive`.
5. `ShopTopBar.tsx`: breadcrumb + search icon popover.
6. i18n keys in 5 locales.
7. Verify: jest, tsc client vs origin/dev, lint changed files, client build, headed Chrome (desktop + 390px)
   as MERCHANT / OUTLET_ADMIN / staff / shop without module on local API + DB `anyrent_960`.
