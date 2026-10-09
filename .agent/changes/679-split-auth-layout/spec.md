# Spec — Split web auth pages

Issue: #679 · Status: accepted · Intent: ./intent.md

## Behavior

1. At viewport ≥1024px, `ShopAuthPage` renders two columns: product panel left, form right,
   50/50 at lg and 3:2 (panel:form) from xl (1280px). Light ground `#F1F5FD`.
2. The panel shows four feature steps, one at a time: no double bookings, AI image search, order status,
   pickups and returns. Each step has an eyebrow (`01 · …`), a title, one line, a browser frame with a real
   web capture, a phone frame with a real iOS capture, and one floating card for that feature.
3. Steps change by themselves every 5 s with a fade/slide-up. There are no step tabs, bars or buttons.
   Hover pauses; with `prefers-reduced-motion: reduce` there is no animation and no auto-advance.
4. Below 1024px the panel is hidden, showcase images do not load, and slideshow rotation stops; the form column looks as before.
5. The client `/login` and `/register` pages show no Google button (email and password only).
6. All panel strings come from `auth.showcase.*` in the five locales. The captures stay Vietnamese.
7. apps/admin login and the `classic` LoginForm are unchanged.

## Out of scope

Copy on the forms, new routes, admin login, dark mode, backend Google OAuth and the mobile apps.

## API and data

None.

## Acceptance

- [ ] 1–5: screenshots of /login at 1440, 1280, 1024 and 375px, each step, plus reduced motion
- [ ] 5: key parity check across locales
- [ ] type-check + lint for packages/ui and apps/client

## Review corrections

- Captures use lazy loading; rotation is gated to desktop with no reduced motion.
- Language selector is at the top right on desktop; each capture has a per-step alt description in all five locales.
