# Plan

Status: in progress

1. Failing test `tests/api/register-no-demo-data.test.ts` (register creates no product/customer/order), commit.
2. Remove the seeding in the register route and `registration.ts`; drop the dead helpers; fix test mocks and e2e comments.
3. Tests in TZ=UTC and Asia/Ho_Chi_Minh, `tsc` for apps/api; LOG row; PR into dev.
