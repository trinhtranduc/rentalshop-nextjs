# #960 Spec

## Sidebar sub-menu
- `ShellNavItem.children` (new, optional): `{ key, href, exact? }`. The attendance item gets five children:
  `/attendance` (exact), `/attendance/person`, `/attendance/shifts`, `/attendance/templates`,
  `/attendance/locations` (+ children such as `/attendance/locations/12`).
- Children show only when the parent shows (`filterNavForRole` unchanged: module + MERCHANT / OUTLET_ADMIN).
- `activeNavChild(item, pathname)` picks the active child. The group opens itself when a child is active and
  can be collapsed / expanded with its header button (`aria-expanded`).
- Switching between sub-items keeps `?outletId` / `?month`, as the old tab strip did.
- Same component in the desktop sidebar and the mobile drawer.

## Attendance pages
- `AttendanceTabs` and the tab model are removed; every attendance page loses the strip. Back links stay.

## Top bar
- Left: breadcrumb from `buildBreadcrumb(pathname)`: top nav label, then the active child (attendance), then
  the rest of the path: known words (`create`, `edit`, `add`, `import`, ...) get a label, anything else is an
  id shown as `#id`. Every crumb links except the last; an id under `/outlets` has no page, so no link.
  Unknown routes give no crumbs.
- Narrow screens: middle crumbs hide, the last crumb stays and truncates.
- Right: search icon button + theme + bell. The icon or "/" (not while typing, no modifier) opens a popover
  with the same search form (submit → `/orders?q=`); Escape or a click outside closes it.

## i18n
`common.shell.nav.attendanceSub.*`, `common.shell.crumbs.*`, `common.shell.breadcrumb`,
`common.shell.searchOpen` in en / vi / ja / ko / zh.
