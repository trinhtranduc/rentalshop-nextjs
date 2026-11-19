# Plan — Gia hạn gói lúc nào cũng được

Issue: #1629 · Status: done · Spec: ./spec.md

1. Tests red: `tests/plan-renewal-rule.test.ts` (spec 1, 2, 5), `tests/api-compat/subscription-login-api-compat.test.ts`
   (status scenarios activeBasic20Days, cancelledProfessional). Commit alone.
2. `apps/api/lib/plan-renewal.ts`: drop the window branch; comments say `RENEW_WINDOW_DAYS` is the Home reminder.
3. LOG row in `.agent/api-changes/LOG.md`.
4. Verify (`verify-change`): Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh, API type-check vs `origin/dev`, lint on the file.
5. E2E (`mobile-e2e-local`, visible Simulator, own DB, local API): new hosted steps in
   `PlanRenewalHostedE2ETests` + `plan-renewal-e2e.sh` step `owner-anytime`: MANUAL Basic with 73 days → no Home line,
   Basic selectable, "Gia hạn 12 tháng", disclosure continues from the old end → purchase → "Dùng đến" keeps 73 days;
   upgrade to Professional; cancel (non-refund) → still Home, plan screen "Bật lại tự gia hạn", period unchanged.

Result (2026-11-19): Jest 72/72 under TZ=UTC and TZ=Asia/Ho_Chi_Minh; full Jest same failures as `origin/dev`; API tsc no new
errors; eslint 0. `plan-renewal-e2e.sh ios owner-anytime` on the AnyRent-1612 iPhone 17 Pro simulator: 3 passed, 0 failed;
the row after cancel is ACTIVE, Professional, autoRenew false, cancelAtPeriodEnd true, ends 31/01/2028 (unchanged).
