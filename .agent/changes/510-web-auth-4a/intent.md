# Intent — #510 Shop web login and sign-up in the 4A dotted style

Issue: #510 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-06

## Problem

The merchant web `/login` and `/register` pages use the old gradient-and-blobs style. They do not match the
approved Đăng nhập and Tạo cửa hàng boards (https://claude.ai/artifact/LQW4YkXiGwHzwNEBZSMX3j), which follow
mobile style 4A. Split out of #509.

## Proposed outcome

Client `/login` and `/register` show a white page with a dotted grid fading downward, a 72px logo with
"AnyRent", a centred heading, and 52px fields with a blue focus ring, all in Be Vietnam Pro. The auth
behaviour is identical.

## Affected users and systems

Visitors and merchants signing in or registering on `apps/client`. `LoginForm` and `RegisterForm` in
`packages/ui` are shared with `apps/admin`.

## Constraints

- `apps/admin` login and register must look exactly as before.
- The validation, Google sign-in, register steps, referral code and redirects must not change.
- New strings go in all five locales.

## Open questions

- None blocking.

## Decision log

- 2026-10-06 — The board's step 1 shows shop fields first. The real flow keeps account fields first and the
  business step second, because the API and validation expect that order. Only the look changes (Claude).
- 2026-10-06 — Add an `appearance="shop"` prop to the shared forms instead of copying their logic. The default
  stays `"classic"`, so admin is untouched (Claude).
