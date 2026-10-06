# Intent — #546 Shop web Khách thân thiết on the new shell

Issue: #546 · Status: accepted (owner: "redraw every page still on the old UI, following the design system; many issues, many PRs") · Created: 2026-10-06

## Problem

`/loyalty` renders the shared `LoyaltySettings` from `packages/ui`: title "Loyalty", English "Level" and "Draft",
hard-coded Vietnamese strings, light-only colours (`bg-white`, `bg-amber-50`, `bg-blue-50`) that break dark mode, and a
`Badge` (a `<div>`) inside a `<p>` at lines 437–442 and 473–478, which React reports as a hydration error.

## Proposed outcome

A client page on the shell tokens laid out like Cài đặt (tab list left, one card right) with every text in i18n and the
same states, calls and locking rules as before. No hydration warning, light / dark, 390px.

## Why redraw instead of wrapping

`packages/ui` may not be edited, and the `<div>`-in-`<p>` is inside the component, so no wrapper can fix it. Only
`apps/client/app/loyalty/page.tsx` imported `LoyaltySettings`; the page stops using it. The component stays in
`packages/ui` untouched (unused by apps after this change; removing it is a separate cleanup).

## Affected users and systems

MERCHANT (the nav shows Khách thân thiết only to the owner). OUTLET roles can still open the URL and see the same
program read from the API as before. `apps/client` only.

## Constraints

- UI only: `loyaltyApi.getProgram / getTiers / upsertProgram / createTier / updateTier / deleteTier`. `isActive` is never
  sent (Super Admin only). No API change → no mobile parity / API-compat work.
- Loyalty has no namespace; it used to be a Cài đặt tab, so strings go in `locales/{en,vi}/settings.json` → `web.loyalty`
  (ja/ko/zh have no settings.json).
- Tier preset names ("Thành viên", "Đồng", …) are stored on the tier and matched by name, so they stay as data.

## Open questions

- none

## Decision log

- 2026-10-06 — selects, switches and the tier checkbox are drawn on tokens (native `<select>`, a token switch) instead of the
  shared Select / Switch, so they follow dark mode without overrides (agent).
- 2026-10-06 — the "Draft" tag next to the inactive banner is dropped; the header tag already says "Chưa kích hoạt" (agent).
