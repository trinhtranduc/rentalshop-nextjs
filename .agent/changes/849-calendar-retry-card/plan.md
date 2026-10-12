# Plan
1. Failing test `tests/web-calendar-subscription.test.ts` (rule + page wiring). Commit alone.
2. `calendar-model.ts`: `subscriptionBlocked`. `calendar/page.tsx`: status read keyed on the retry nonce; blocked
   forces the month and day failure cards. Branch select (#852) untouched.
3. Verify: jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh, tsc on apps/client, eslint on changed files,
   `scripts/e2e/web-e2e.sh --plan --only WEB-SUB-0` headed. Compare with the latest `release-*` tag.
