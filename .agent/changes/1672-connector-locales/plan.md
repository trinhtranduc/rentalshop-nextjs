# Plan #1672

1. Test đỏ: `/rules.locales` = `/meta.locales`; `locale: 'xx'` → 422 chỉ có `details.locale`, không gọi DB.
2. `apps/api/lib/seo-connector/handler.ts`: `RULES.locales`, `RULES.voice`, status 422 khi `details.locale`.
3. LOG.md một dòng. `yarn test seo-connector no-raw-server-errors` ở `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
