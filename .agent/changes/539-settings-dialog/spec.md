# Spec — #539 Cài đặt dialog

## URL

- Open: current path + `settings=<tab>` (other query params kept). `settings=` (empty) or an unknown/forbidden tab
  → the role's default tab (`resolveTab`, unchanged).
- Open, tab change and close all use `router.replace`: no history entries, so back never lands on the same page
  twice. Back while the dialog is open leaves the page, as before.
- Close: remove `settings` (and `checkout`, `action`) from the query; stay on the page.
- `/settings?tab=x&…` → `router.replace('/dashboard?settings=x&…')` keeping other params (`checkout`, `action`).
  `?tab=loyalty` still goes to `/loyalty`.

## Dialog

- Overlay `fixed inset-0`, `bg-black/40`, z-[60] (below shared dialogs at z-[100], above the shell drawer z-50).
- Panel `ar-theme`: lg+ width `min(1040px, 100vw-48px)`, height `min(720px, 100vh-48px)`, radius 16, shell surface.
  Below lg: full screen.
- Left column (lg+, 240px, subtle background): title "Cài đặt", then the tab list (shop group, divider, me group).
  Below lg: title row with ✕, tab list as a horizontal scroll strip.
- Right: section title (the tab name) + ✕ on lg+, then the section cards, scrolling inside.
- `role="dialog"`, `aria-modal`, `aria-labelledby` the title. Esc closes (not while a shared dialog is open above it:
  Radix stops the key). Focus moves into the dialog on open and back to the opener on close. Body scroll locked.
- Sidebar item "Cài đặt cửa hàng" shows active while the dialog is open.

## Not changing

Sections, forms, API calls, role rules, the currency sync on the merchant tab.
