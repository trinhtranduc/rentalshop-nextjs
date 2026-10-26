# Plan — Web cọc theo giai đoạn sắp thu

Issue: #1221 · Status: in-progress · Spec: ./spec.md

## Steps
1. Test đỏ trong `tests/web-overview-model.test.ts`.
2. `overview-model.ts`: kiểu + `futureInstallmentsTotal`. Kiểu `FutureInstallmentGroup` đã có ở `packages/utils` (revenue-calculator, period-report), nên chỉ thêm field optional vào `SeriesPointLike` của web, không sửa `packages/utils`.
3. `sections.tsx` `CollectedChart` + `page.tsx`: hiện dòng. `locales/*/dashboard.json`: `home.chart.upcomingInstallments`.
4. Skills: timezone-dates (dùng khoảng biểu đồ sẵn có), i18n-keys. Verify: jest TZ=UTC và TZ=Asia/Ho_Chi_Minh, locales-valid-json, tsc client, mắt.

## Files
- `apps/client/app/dashboard/{overview-model.ts,page.tsx,overview/sections.tsx}`, `locales/*/dashboard.json`, `tests/web-overview-model.test.ts`, `.agent/api-changes/LOG.md`

## Rollback
Revert PR; chỉ web.
