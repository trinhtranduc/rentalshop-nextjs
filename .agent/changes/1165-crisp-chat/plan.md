# Plan — Crisp chat on public pages

Issue: #1165 · Status: accepted · Spec: ./spec.md

## Steps

1. Add `apps/client/app/components/CrispChat.tsx` (client `useEffect`, skip if `window.CRISP_WEBSITE_ID` is already set).
2. Mount it from `PublicSiteFooter` so blog/download/affiliate get the widget too.
3. Hide the landing `FloatingButtons` cluster (`false &&`) without deleting contact-card social links.
4. Verify: grep + type-check `apps/client`. No API tests. Skills: none of the API/date/migration set.

## Files

- `apps/client/app/components/CrispChat.tsx` — load `l.js` once
- `apps/client/app/components/PublicSiteFooter.tsx` — mount widget
- `apps/client/app/LandingPageClient.tsx` — hide floating cluster

## Risks

Crisp domain lock in the dashboard can hide the bubble on localhost. Production shows it after this lands on the client deploy branch.

## Rollback

Revert the PR. Crisp workspace can stay.
