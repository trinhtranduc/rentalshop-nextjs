# Spec — Split web auth pages

Issue: #679 · Status: accepted · Intent: ./intent.md

## Behavior

1. At viewport ≥1024px, `ShopAuthPage` renders two columns: intro panel left, form column right,
   50/50 at lg and 3:2 (intro:form) from xl (1280px).
2. The intro panel is a 5-step carousel, one message per step: intro, rental calendar, orders,
   double-booking warning, AI image search. Each step has a title, one line, and its own image in a 3:2 frame.
   Steps advance every 5 s with a fade/slide-up; hover pauses; the progress bars jump to a step;
   with `prefers-reduced-motion: reduce` there is no animation and no auto-advance.
3. Below 1024px the intro panel is not rendered visibly (`hidden lg:flex`); the form column looks as today.
4. In the split view the form column keeps its own brand mark hidden on lg (the panel carries the brand)
   and keeps the terms · privacy · language footer.
5. All panel strings come from `auth.showcase.<step>.{title,desc}` and `auth.showcase.goTo` in the five locales.
6. apps/admin login and the `classic` LoginForm are unchanged.

## Out of scope

Copy on the forms, new routes, admin login, dark mode.

## API and data

None.

## Acceptance

- [ ] 1–4: screenshots of /login and /register at 1440px and 375px
- [ ] 5: key parity check across locales
- [ ] type-check + lint for packages/ui and apps/client
