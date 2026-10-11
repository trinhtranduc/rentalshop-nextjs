# Plan
1. Failing tests: `tests/packages/utils/plan-change-rules.test.ts` (spec 1-5) and `tests/e2e/business/plan-change.e2e.test.js` BF-PLAN (spec 6-13); update BF-BILL change-plan calls to send `method` and `transactionId`.
2. `canChangePlan`; error codes (5 locales).
3. `changePlan` with the payment in one transaction and trial activation; the two plan routes; the extend route.
4. UI: change-plan and extend dialogs, merchant plan adapter, check at 390 px.
5. LOG row; Jest both TZ; e2e BF-PLAN, BF-BILL, BF-SUB both TZ; admin build; PR in Vietnamese, `Fixes #785`.
