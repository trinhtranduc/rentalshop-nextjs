# Spec

For every screen, below 768 px:
1. No horizontal scroll: content width (`main` scrollWidth and `documentElement.scrollWidth`) equals the viewport (390).
2. Lists: each row is a card (the `table-cards` pattern: `data-primary`, `data-label`, `data-actions`; defined only in `apps/admin/app/globals.css`), or the existing phone card list when the component already has one; filters stack; headers wrap; pagination fits.
3. Every button, input, select, menu item, tab and checkbox row is at least 44 px high (`max-md:min-h-11` or the existing responsive classes); small icon buttons get a 44 px tap area.
4. Dialogs: full screen (`max-md:` classes as in `ManualRenewalModal`), the middle scrolls, the primary action fixed at the bottom with `ResponsiveDialogFooter`.
5. Dates shown on the Vietnam day as `dd/MM/yyyy` (and `HH:mm` when a time is shown), not the US order; use the shop-zone helpers (`formatInShopZone`, `formatDateKeyInTimeZone`), never `toLocaleDateString`, `toISOString().split`, `getDate`.
6. Detail and form pages: groups of fields stack to one column; action buttons stack or wrap with the main action first.
7. The Quick Actions menu: items are 44 px; the menu opens as a sheet or a full-width list that stays inside the screen.
8. From 768 px nothing changes (compare screenshots at 1280 px). `apps/client` shares `packages/ui`: new behavior must be opt-in (`table-cards`) or `md:` / `max-md:` prefixed and must not change the client at ≥ 768 px.

Screens: merchant detail page (`/merchants/[id]`) and its menu; dialogs Pause Plan, Cancel Plan, View History (and Import history); outlets (list, `[outletId]`); users (list, `[userId]`); products (list, `[productId]`, `[productId]/orders`); customers; orders (list, `[orderId]`, `[orderId]/edit`, `create`); `edit`; `plan-limit-addons`.

Not changed: data, API, permissions, Change Plan / Extend Plan dialogs (#783, #785).
