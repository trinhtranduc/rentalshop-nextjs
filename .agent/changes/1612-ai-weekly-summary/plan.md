# Plan — #1612

Issue: #1612 · Status: accepted · Spec: ./spec.md

1. `prisma/schema.prisma`: model `AiWeeklySummary`; migration adds the table (owner places the file: hook).
2. `apps/api/lib/weekly-summary/`: `week.ts`, `numbers.ts`, `prompt.ts`, `claude.ts`, `service.ts`; dependency
   `@anthropic-ai/sdk` 1.4.0 (claude-api skill: structured output via `output_config.format`, `effort: low`).
3. Route `apps/api/app/api/analytics/weekly-summary/route.ts` (GET, POST); error codes in `locales/*/errors.json`
   and the response-builder fallback (`i18n-keys`).
4. Tests: `tests/api/weekly-summary-*.test.ts` (week keys, language, prompt has no customer names, parse, route
   roles / availability / cache / NO_ORDERS / failure not stored / race).
5. Web: `apps/client/app/dashboard` button + side panel; `locales/*` keys.
6. iOS: `OverviewV2ViewController` floating button + sheet; Android: `OverviewV2Screen` same (`mobile-parity`).
7. `.agent/api-changes/LOG.md` row.
8. Verify: jest, tsc (api, client), lint, API build, local API with a fake Anthropic server (`ANTHROPIC_BASE_URL`),
   headed Chrome, iOS simulator, Android emulator.
