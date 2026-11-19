# Plan — Gia hạn gói lúc nào cũng được

Issue: #1629 · Status: in-progress · Spec: ./spec.md

1. Tests red: `tests/plan-renewal-rule.test.ts` (spec 1, 2, 5), `tests/api-compat/subscription-login-api-compat.test.ts`
   (status scenarios activeBasic20Days, cancelledProfessional). Commit alone.
2. `apps/api/lib/plan-renewal.ts`: drop the window branch; comments say `RENEW_WINDOW_DAYS` is the Home reminder.
3. LOG row in `.agent/api-changes/LOG.md`.
4. Verify (`verify-change`): Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh, API type-check vs `origin/dev`, lint on the file.
5. E2E (`mobile-e2e-local`, visible Simulator, own DB, local API): new hosted steps in
   `PlanRenewalHostedE2ETests` + `plan-renewal-e2e.sh` step `owner-anytime`: MANUAL Basic with 73 days → no Home line,
   Basic selectable, "Gia hạn 12 tháng", disclosure continues from the old end → purchase → "Dùng đến" keeps 73 days;
   upgrade to Professional; cancel (non-refund) → still Home, plan screen "Bật lại tự gia hạn", period unchanged.
