# Plan — #527

1. `apps/client/app/calendar/calendar-model.ts`: month parse/shift, Monday-first grid, day counts from `byDate`/`countByDate`/`lateReturns`, day rows (sub line, money, products), merge of late returns.
2. `apps/client/app/availability/availability-model.ts`: period / qty parse, quick periods, strip days, holders from `/api/orders`, free units per day, bar columns and text, verdict, similar products.
3. `tests/web-calendar-model.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
4. `apps/client/app/calendar/page.tsx` and `apps/client/app/availability/page.tsx` on `ar-*` tokens, reusing `orders/list/parts` and `orders/create/{parts,create-model}`.
5. i18n `locales/{en,vi}/{calendar,availability}.json` → `web`.
6. Verify: jest (both TZ), lint, client tsc (no new errors), screenshots via `scratchpad/shots/calendar.js` (lead runs after the build).
