# Plan #1420

Skills: i18n-keys, verify-change.

1. Tests first in `tests/web-order-photos.test.ts`.
2. `orders/detail/actions-model.ts`: rule and note groups. `orders/detail/photos.tsx`: block, card, warning. Export `PendingThumb`, `NOTE_IMAGE_MAX_MB` from `settings.tsx`.
3. Wire `dialogs.tsx`, `orders/[id]/page.tsx`. Locales.
4. Verify: jest, `locales-valid-json`, lint and type-check against base, headed Chrome on local API.
