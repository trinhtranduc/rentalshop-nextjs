# Plan — timezone batch C (#587)

1. Branch `fix/587-tz-batch-c` from `origin/dev`.
2. Commit failing tests alone: `tests/packages/{utils,ui,admin,hooks}/…` (shop-zone-display, shop-day-helpers,
   order-date-presets, subscription-dates, ranking-period-vn-day, dashboard-vn-day, product-availability-civil-day).
3. Fix (FIX_MODE): shop-day helpers → date.ts formatters → ui lib/utils → order filters/export → subscription
   dialog/form → picker + OrderInfoSection + RentalPeriodSelector → hooks → admin dashboard → admin display sites
   → calendar.ts cleanup.
4. Verify: new tests in four zones; full Jest in UTC and VN vs `origin/dev`; type-check/lint admin, ui, utils, hooks;
   admin in a browser (UTC, Los Angeles, Vietnam) on :3293 with writes stubbed; client importers checked.
5. PR into `dev`: `Fixes #587`, `Part of #578`, owner question (month clamp) at the top, before/after table.

Files: `packages/utils/src/core/{shop-day,date,index}.ts`, `packages/utils/src/api/calendar.ts`,
`packages/ui/src/lib/utils.ts`, `packages/ui/src/components/{ui/date-range-picker.tsx,
features/Orders/components/{OrderDateRangeFilter,OrderQuickFilters,order-date-presets}.tsx?,
features/ExportDialog/ExportDialog.tsx, features/Subscriptions/components/{SubscriptionExtendDialogEnhanced,
SubscriptionForm,SubscriptionList,subscription-dates}.tsx?, forms/CreateOrderForm/components/OrderInfoSection.tsx,
features/Orders/RentalPeriodSelector.tsx}`, `packages/hooks/src/hooks/{useProductAvailability,usePaymentsData}.ts`,
`apps/admin/app/{dashboard/{ranking-period,dashboard-buckets}.ts,dashboard/page.tsx,orders/page.tsx, …display sites}`.

Rollback: revert the PR (no data or API change).
