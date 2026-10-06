# Plan — #546

1. `apps/client/app/loyalty/loyalty-model.ts`: presets, defaults, payloads, access state, locks, number helpers (no `@rentalshop/*`).
2. `tests/web-loyalty-model.test.ts` (TZ=UTC and TZ=Asia/Ho_Chi_Minh).
3. `apps/client/app/loyalty/page.tsx`: shell layout, tabs, four cards, confirm (`orders/create/parts` Modal,
   `settings/sections` SectionCard). Skill: `i18n-keys`.
4. `locales/{en,vi}/settings.json` → `web.loyalty`.
5. Verify: jest both TZ, eslint, client tsc (no new errors), browser as merchant with every write intercepted (the seeded
   program stays as is): real inactive program, a faked active program (save, tier add / save / delete) and a faked
   PLAN_UPGRADE_REQUIRED; OUTLET_STAFF; light + dark at 1440 and 390; console without hydration warning.
