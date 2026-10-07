# Intent — #582 Redraw the last old-UI pages of the shop web

Issue: #582 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-06

## Problem

After the shell, login and register redraws, a few shop web pages still show the old UI:

- `/forget-password`, `/reset-password`, `/verify-email`, `/email-verification`: blurred gradient blobs,
  "© RentalShop" footer, hard-coded English / Vietnamese strings. A fake reset token shows the
  **success** card, because the old shared form marks itself done whatever the page reports.
- `/plans`: English ("Choose Your Plan", "Features", "Select Plan"), "Not set" for every limit (the API
  sends `limits` and `features` as JSON strings), money "$79,000.00", no dark mode.
- `/affiliate`, `/affiliate/guide`: old cards, orange theme, hard-coded copy ("Đi đến Settings",
  "Real-time", "© 2025"), stale instructions ("Business or Outlet tab"), and
  `IntlError: FORMATTING_ERROR ... "strong" was not provided` on the guide.

Owner: "redraw every page still on the old UI, following the design system".

## Proposed outcome

- The four auth helper pages look like `/login` (dotted 4A background, 72px brand mark, 400px column,
  52px fields, 54px primary button, terms · privacy · language footer) with the same flows.
- `/plans` is a shell page on the `ar-*` tokens, Vietnamese by default, prices like Cài đặt → Gói dịch vụ,
  current plan tagged, real limits, same select → billing cycle → confirm → Lemon Squeezy checkout.
- `/affiliate` and `/affiliate/guide` stay public (they are in `PUBLIC_ROUTES`, outside the shell, and
  `/affiliate` is in the sitemap) and use the landing look (public header and footer), with corrected copy
  and no IntlError.

## Affected users and systems

Signed-out visitors (auth, affiliate), merchants (`/plans`, affiliate link card). App: `client` only.

## Constraints

- No `packages/**`, `apps/api/**`, schema or mobile change → no mobile parity / API compat impact.
- Every API call, query param and redirect of the auth pages stays.
- `SUBSCRIPTION_UPGRADE_EXTEND_ENABLED` (Settings) untouched; `/plans` flow kept.
- Dark mode for `/plans`; 390px for every page.

## Open questions

- `/plans` is not linked from the shell any more (only old, unused components link it); it keeps the
  Lemon Squeezy purchase even though Settings hides upgrade. Owner may want it gated too — not changed here.
