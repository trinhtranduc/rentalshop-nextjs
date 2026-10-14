# Plan — #973

Status: in-progress

1. Unit tests `PadLayoutTests` (column, form sheet, photo, popover anchor, camera, Info.plist).
2. `Utils/PadLayout.swift` + anchors at the three nil-able action sheets.
3. Column on Home, product detail, cart, orders, order detail, Settings, customers, notifications, Settings detail screens (header helper, bottom bar, printer, my shifts, users, bank accounts, export, store info, app info, categories, product calendar, top products).
4. UI test helpers iPad-aware (top tab bar has no `tabBars` element; rotate to landscape) + tour.
5. Verify: unit suite on iPad mini, tour on iPad Pro 13" and iPad mini, before/after screenshots.
Domain skills: mobile-parity (iOS only, no API/shape change → Android untouched), mobile-e2e-local.
