# Plan — #826

1. Failing tests: `tests/api/plan-limit-addon-branch-plan.test.ts` (helper, both POST routes, PUT, admin page
   source, 5 locales); `plan-limit-addon-update-route.test.ts` gets a merchant on a multi-branch plan in its mock.
2. `packages/utils/src/core/plan-addon-rules.ts`: `isMultiBranchPlan`, `addonAddsBranches`; export from core.
3. Guard in the three routes; `ErrorCode.ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN` (422) + 5 locales.
4. Admin page: `translateError(response)` in the toasts.
5. Verify: add-on suites + `error-codes-translated` in TZ=UTC and Asia/Ho_Chi_Minh, full jest vs base,
   tsc for api/admin on the touched files. LOG.md row, PR to `dev`.
