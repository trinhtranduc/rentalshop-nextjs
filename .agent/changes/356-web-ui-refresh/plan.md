# Plan — #356

Done on branch `feat/availability-ui-preview` (one commit per screen, tests first where logic changed):

1. Order Check, create order, order detail (tests: availability-days, order-collection, order-overdue, rental-days, receipt-totals).
2. Dashboard / outlet operations (#350; tests: outlet-operations, order-date-range).
3. Products: list, edit, add, view (`ProductForm layout="page"`).
4. Users: list cards, view page, add/edit dialogs (`UserForm layout="dialog"`), change-password target.
5. Customers: `CustomerProfile` components, `CustomerTable` cards, `CustomerFormDialog` fields.
6. Settings: `SettingsLayout` menu, section read-only styles, subscription formatting.
7. Settings: `ReceiptSection` (Outlet.printNote per outlet, #347).
8. API: `db.merchants.ensureTenantKey` used by the login response and `GET /merchants/:id`.

Verify:
- `cd tests && TZ=UTC yarn test` and `TZ=Asia/Ho_Chi_Minh yarn test`: same 26 env-dependent suites fail as on `origin/dev`; all new suites pass.
- `npx tsc --noEmit` on client, ui and api: no new errors in changed files.
- `next lint` on changed client files: 164 errors on dev → 150 on the branch, none added per file.
- Playwright + axe on every changed screen at 1440 and 390 px; real create/edit/delete flows on the local DB.
