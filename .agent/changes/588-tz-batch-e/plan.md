# Plan — timezone batch E (#588)

1. Failing tests, committed alone (`test(api): …`):
   `tests/packages/utils/billing-dates-vn-day.test.ts` (E1, E2, proration, extension pricing),
   `tests/subscription-emails-vn-day.test.ts` (E3 emails + reminder audit text, prisma client mocked, no send),
   `tests/loyalty-yearly-reset-vn-day.test.ts` (E4). Run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
2. `FIX_MODE=1`. Add `packages/utils/src/core/billing-dates.ts` (`civilDaysBetween`, `addMonthsInTimeZone`),
   export from `core/index.ts`. Use it in proration, billing calculations, status/manual/extend/renew/revenuecat/
   lemonsqueezy routes. Emails get `timeZone`. Loyalty uses the VN day. Reminder text uses the VN key.
3. Verify: new tests both TZ, full suite both TZ vs `origin/dev`, lint + type-check of api/utils/loyalty/database,
   API build, local API on :3195 (`anyrent_biz_e`) for before/after of `GET /api/subscriptions/status`.
4. PR into `dev`: clamp question first, list of changed results with examples, compat table.

Rollback: revert the PR (no data or schema change).
