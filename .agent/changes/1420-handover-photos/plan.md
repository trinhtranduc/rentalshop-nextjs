# Plan #1420

Skills: i18n-keys, verify-change.

1. Tests first in `tests/web-order-photos.test.ts`: limits, room, resend rule, add-later rule, toast silencer, keys in five locales.
2. `orders/detail/actions-model.ts`: rule. `orders/detail/photos.tsx`: block and add tile. Export `Thumb`, `PendingThumb`, `NOTE_IMAGE_MAX_MB` from `settings.tsx`.
3. Wire `dialogs.tsx`, `sections.tsx` (NotesCard), `orders/[id]/page.tsx`. Locales.
4. Verify: jest, `locales-valid-json`, lint and type-check of changed files against base, headed Chrome on local API.
