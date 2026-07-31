# Android ↔ iOS Feature Parity Plan

> Superseded for current priority/order by
> `ANDROID_PARITY_REAUDIT_2026-07-31.md`. This file is retained as the original
> detailed gap inventory and PR decomposition.

Audit baseline:

- Branch: `feat/android-push-notifications`
- Android HEAD: `a47ecc33`
- iOS source: `apps/mobile/POS ADBD`
- Android source: `apps/mobile-android`
- Audit date: 2026-07-31

Implementation status (2026-07-31):

- PR 0 started: typed `AppError`, availability repository contract/default
  implementation, app container, and ViewModel test setup are implemented.
- PR 1 core flow implemented: product search, product/date/quantity availability
  check, stock metrics, conflicts, related orders, and separate “Find order”
  navigation.
- PR 1 barcode selection is implemented: the camera returns the scanned product
  to the availability ViewModel without adding it to the cart.
- PR 1 remaining: complete same-account iOS/Android manual parity testing on a
  physical device.

## Scope and parity rule

Parity means both platforms provide the same business outcome, permissions,
validation, error handling, and destructive-action confirmation. UI does not need
to be pixel-identical.

The following remain intentionally out of scope until product changes the
decision:

- AI product image search
- Label printing
- Bank-account management in Settings (the iOS menu is currently hidden)
- Account deletion (the iOS action currently shows “Coming Soon”)

## Confirmed gaps

| Priority | Area | Android today | iOS behavior to match |
|---|---|---|---|
| P0 | Product availability checker | “Order check” looks up an order number | Select/scan a product and date; show stock, renting, effective availability, conflicts, and expandable order history |
| P0 | Payment QR | Fetches QR payload and displays it as text | Render QR, show bank/account details, handle unavailable configuration, and allow save/share |
| P0 | Payment lifecycle | Generic manual collection sheet | Correct modes for rental deposit, pickup balance, return refund, and full sale payment, with amount limits and payment history refresh |
| P0 | Order notes and evidence | Text notes only | Add/view/remove note images from camera or gallery and preserve existing URLs when editing |
| P0 | Product pricing contract | Rent price is treated as one daily price; cost price is missing | Preserve fixed price, daily price/pricing options, sale price, cost price, deposit, barcode, stock, and image consistently |
| P1 | Analytics overview | Period totals, growth, and top-five lists | Revenue/order charts, date/year selection, operational/deposit metrics, permission restrictions, ranking drill-down, and orders behind each ranking |
| P1 | Customer context | CRUD and cart selection only | Loyalty level/points where enabled and customer order history/detail navigation |
| P1 | Product catalog UX | Text-only rows; one gallery picker | Product image/availability state, camera or gallery image source, preview/compression, generated barcode, and equivalent validation |
| P1 | Order discovery | Search plus status/type filters | Date-aware filtering, sorting, and equivalent filter state/reset behavior |
| P1 | Store/account information | Name, address, phone only | Staff/role/email plus full outlet address fields and merchant affiliate/public-product links where available |
| P1 | Export | Orders/products/customers, hard-coded current month | Permission-aware export types, period/date choice, authenticated download, and analytics export where allowed |
| P2 | Notifications | Open marks read; long-press deletes | Explicit read/unread toggle, destructive confirmation, refresh behavior, and unread badge synchronization |
| P2 | Printing | Network ESC/POS only | Decide whether Bluetooth parity is required; if yes, scan/pair/test/persist and print through a printer adapter |
| P2 | Localization/accessibility | Several hard-coded English strings and unlabeled icons | Complete Vietnamese/English resources, content descriptions, large-text behavior, and touch target audit |
| P2 | Tablet/adaptive layout | Mostly phone-width Compose layouts | Two-pane or constrained-width layouts for tablets where iOS has iPad-specific behavior |

## Phase 1 — Close transactional blockers

### 1. Product availability checker

- Replace the current order-number lookup presented as “Order check” with a
  product availability flow.
- Support product search and barcode scan.
- Add date selection.
- Parse the availability response into a typed domain model:
  `stock`, `renting`, `shelfAvailable`, `effectiveAvailable`, and conflicts.
- Display related orders and navigate to order detail.
- Keep order-number scan/search as a separate “Find order” action.

Acceptance:

- The same product/date/outlet gives equivalent metrics and conflicts on iOS and
  Android.
- Loading, empty, API-error, and fallback states are explicit.
- A related order opens the correct detail screen.

### 2. Payment and QR parity

- Introduce typed payment intents: `deposit`, `pickupBalance`,
  `returnRefund`, and `sale`.
- Calculate allowed amount from order status and payment history rather than from
  `total - deposit` alone.
- Validate positive amount and upper/refund bounds before calling the API.
- Render the server QR response as an image and show bank name, account number,
  holder, branch, and transfer content.
- Add save/share using Android storage and share-sheet APIs.

Acceptance:

- Each RENT/SALE status exposes only valid payment actions.
- Duplicate taps cannot submit duplicate payments.
- Success refreshes order totals/history; failure preserves entered data.
- QR missing-bank-account and malformed-response states are handled.

### 3. Order note images

- Add a reusable attachment picker supporting camera and gallery.
- Enforce the same attachment count/size rules as iOS.
- Upload new images, retain unchanged URLs, and remove deleted attachments.
- Show thumbnails and full-screen preview on order detail.

Acceptance:

- Create/edit/reopen preserves text and images.
- Partial upload failure does not silently discard existing attachments.

## Phase 2 — Correct data-contract parity

### 4. Product form and pricing

- Extend `Product` and request models with cost price and typed pricing options.
- Do not collapse `FIXED` and `DAILY` into a single `rentPrice`.
- Load current pricing values before editing and round-trip unchanged fields.
- Add image preview, camera source, compression, generated barcode, and matching
  required-field validation.
- Confirm category is supported by the API/iOS product decision; retain Android’s
  category support if it is intentionally ahead of iOS.

Acceptance:

- Editing only the name does not alter pricing, cost, stock, category, barcode,
  deposit, or image.
- Create/update API contract tests cover fixed, daily, sale-only, and optional
  price combinations.

### 5. Order list filters and sorting

- Define a single filter state: query, type, status, start/end date, and sort.
- Reset pagination whenever any filter changes.
- Preserve filters when returning from detail.
- Deduplicate appended pages by order ID.

Acceptance:

- Android and iOS return equivalent order sets for the same filter.
- Refresh and load-more cannot mix results from stale queries.

### 6. Customer detail

- Add customer detail separate from edit form.
- Load customer orders through `/api/customers/{id}/orders`.
- Load loyalty summary only when the merchant has loyalty enabled.
- Navigate from customer history to order detail.

Acceptance:

- CRUD remains permission-gated.
- Loyalty-disabled merchants never see misleading zero-point UI.

## Phase 3 — Reporting and operational tools

### 7. Overview/reporting

- Add custom date and year selection.
- Use typed responses for period summary, income series, growth, top products,
  top customers, and operational/deposit metrics.
- Add revenue and order charts.
- Add ranking “view all” and drill-down to matching orders.
- Match iOS report permissions for staff/admin roles.

Acceptance:

- Period range is inclusive and timezone-consistent.
- Totals shown above charts match the API summary.
- Today/7d/30d/year/custom date each load their own data without stale values.

### 8. Store info and export

- Expand store info to the fields supported by the outlet API.
- Expose read-only user/role/email and merchant links.
- Replace hard-coded month exports with a period/date selector.
- Gate each export type using the same permissions as iOS.
- Keep downloads authenticated and share the resulting local file.

Acceptance:

- Staff cannot see or invoke unauthorized exports.
- Export errors are shown inside the screen rather than opening an unauthenticated
  browser URL.

## Phase 4 — UX parity and hardening

### 9. Notifications

- Add read/unread toggle and delete confirmation.
- Update the global unread count after every inbox mutation.
- Add pull-to-refresh and guard pagination from duplicate requests.

### 10. Printer decision

- Product decision: network-only or network + Bluetooth.
- If Bluetooth is required, implement discovery, runtime permissions, selection,
  persisted configuration, test print, disconnect/error states, and a common
  printer interface used by order printing.

### 11. Localization, accessibility, and adaptive UI

- Move remaining literals to `values` and `values-vi`.
- Add content descriptions and semantic state to icon-only controls.
- Verify 48dp touch targets, font scaling, screen-reader order, color contrast,
  landscape, and tablet widths.
- Add confirmations to product/customer/user/order deletion.

## Architecture work required alongside the phases

The current Android screens call `ApiClient`/`ApiParity` directly from
composables and hold business state locally. Before expanding the high-risk
flows:

1. Define repository contracts for availability, orders/payments, products,
   customers, analytics, notifications, and printing.
2. Move validation and state transitions into feature ViewModels.
3. Replace raw `JSONObject` results with typed response/domain models.
4. Inject repositories at the app composition root.
5. Keep platform APIs (camera, sharing, Bluetooth, printing) behind adapters.
6. Map network/API failures to typed app errors.

This can be incremental; each phase should migrate only the features it touches.

## Test plan

### Unit tests

- Availability metric normalization and overlap/error mapping.
- RENT/SALE status transitions and valid payment intents.
- Payment amount/refund validation and duplicate-submit guard.
- Product pricing round-trip and optional-field validation.
- Filter reset, stale-request rejection, pagination deduplication.
- Analytics date-range and timezone calculations.
- ViewModel loading/success/failure states.

### Repository/API contract tests

- Product create/update with fixed/daily/sale pricing.
- Single and batch availability.
- Order edit, payment, refund, notes, and attachments.
- Customer orders and loyalty-enabled/disabled responses.
- Analytics endpoints for all supported periods.
- Notification read/unread/delete and unread count.

### Manual parity matrix

Run the same test account/outlet/data on iOS and Android:

1. Create/edit/delete product and verify all values after reopening.
2. Check availability, add RENT items, and recheck the cart at checkout.
3. Create RENT and SALE orders; exercise every valid status/payment transition.
4. Edit dates/notes/images, display/share QR, and print.
5. Search/filter/paginate orders, products, and customers.
6. Verify customer history and loyalty.
7. Compare calendar and overview values for each period.
8. Verify users, store info, exports, inbox actions, and permissions by role.
9. Repeat offline/timeout/server-error cases for transactional screens.

## Recommended delivery order

1. Phase 1: availability + payment/QR + note images
2. Phase 2: product pricing + order filters + customer detail
3. Phase 3: overview + store/export
4. Phase 4: notifications + printer decision + accessibility/adaptive UI

Each phase should be a separate commit series and must leave
`:app:assembleDebug` green. Phase 1 and Phase 2 should be completed before
calling the Android app functionally equivalent to iOS.

## Execution plan

Use small, reviewable pull requests in the order below. Do not combine unrelated
features into one large parity commit.

### PR 0 — Parity foundation

Goal: create the minimum structure needed to implement transactional features
without adding more API calls directly inside composables.

Work:

- Add typed `AppError` and API error-envelope mapping.
- Add repository contracts and default implementations for availability, orders,
  payments, and products.
- Add an app-level dependency container.
- Add ViewModel test dependencies and fakes.
- Keep existing screens working while repositories are introduced.

Primary files/modules:

- `app/src/main/java/com/anyrent/pos/domain/`
- `app/src/main/java/com/anyrent/pos/data/repository/`
- `app/src/main/java/com/anyrent/pos/di/`
- `app/src/test/`

Exit:

- Existing Android behavior is unchanged.
- Repository success/failure contract tests pass.
- `:app:testDebugUnitTest` and `:app:assembleDebug` pass.

Suggested commit:

- `refactor(mobile-android): add typed repositories and app error model`

### PR 1 — Product availability parity

Depends on: PR 0.

Work:

- Rename the current order-number lookup to “Find order”.
- Build the real availability checker with product search/barcode and date
  selection.
- Add typed availability metrics and conflict/order models.
- Reuse the same repository in the add-to-cart sheet and checkout batch check.
- Add related-order navigation.

Primary files:

- `ui/orders/OrdersScreens.kt`
- new `ui/availability/AvailabilityScreen.kt`
- new `ui/availability/AvailabilityViewModel.kt`
- `ui/home/AvailabilitySheet.kt`
- `ui/home/CartCheckoutScreen.kt`
- `navigation/AnyRentNavHost.kt`

Tests:

- Metric normalization.
- Empty/no-conflict/conflict/error states.
- Product/date change rejects stale responses.
- Checkout remains blocked when any cart line conflicts.

Suggested commits:

- `feat(mobile-android): add product availability checker`
- `refactor(mobile-android): share availability checks with cart`

### PR 2 — Payment lifecycle and QR

Depends on: PR 0. Can start after PR 1 API/model work is stable.

Work:

- Define payment intent/state rules by order type and status.
- Replace the generic sheet with deposit, pickup balance, return refund, and sale
  flows.
- Add loading/idempotency guards and typed payment history.
- Parse QR response into a typed model.
- Render QR and bank details; add save/share.

Primary files:

- `ui/orders/PaymentCollectionSheet.kt`
- `ui/orders/OrderDetailActions.kt`
- new `ui/payments/PaymentViewModel.kt`
- new `ui/payments/PaymentQrScreen.kt`
- new `platform/share/AndroidShareAdapter.kt`

Tests:

- Allowed actions for every RENT/SALE status.
- Maximum collection/refund values.
- Duplicate-submit protection.
- Missing bank account and malformed QR response.

Suggested commits:

- `feat(mobile-android): implement status-aware payment collection`
- `feat(mobile-android): render and share payment QR`

### PR 3 — Order note attachments

Depends on: PR 0.

Work:

- Confirm note-image API field names, upload route, count limit, and removal
  semantics against the current backend.
- Add camera/gallery picker adapter and URI permission handling.
- Add image compression and upload state.
- Add thumbnails, removal, retry, and full-screen preview.
- Preserve existing remote URLs during edits.

Primary files:

- new `ui/orders/OrderNoteEditorScreen.kt`
- new `ui/common/AttachmentPicker.kt`
- new `platform/media/AndroidMediaAdapter.kt`
- order models/repository/API adapter
- `AndroidManifest.xml` and `res/xml/file_paths.xml`

Tests:

- Existing plus new attachment round-trip.
- Remove one image without deleting unchanged images.
- Partial upload failure and retry.
- Permission denied and process recreation.

Suggested commit:

- `feat(mobile-android): add image attachments to order notes`

### PR 4 — Product pricing and form correctness

Depends on: PR 0. Merge before doing broad catalog polish.

Work:

- Confirm backend representation of fixed/daily pricing and optional price fields.
- Extend typed product/pricing models.
- Round-trip all pricing, cost, stock, deposit, barcode, category, and image data.
- Add camera/gallery choice, preview, compression, and barcode generation.
- Add validation and confirmation before deletion.
- Show product image and availability state in catalog rows.

Primary files:

- `data/model/Models.kt`
- product repository/API adapter
- `ui/home/ProductFormScreen.kt`
- `ui/home/HomeScreens.kt`

Tests:

- Create/edit for FIXED, DAILY, SALE-only, and optional pricing.
- Editing one field preserves every untouched field.
- Invalid price/stock/barcode and upload failure.

Suggested commits:

- `fix(mobile-android): preserve complete product pricing contract`
- `feat(mobile-android): complete product image and barcode flow`

### PR 5 — Order discovery and customer detail

Depends on: PR 0. Product work is not a blocker.

Work:

- Move order filters into an `OrdersViewModel`.
- Add date range, sort, reset, persistence on back navigation, stale-request
  cancellation, and page deduplication.
- Split customer detail from customer edit.
- Add customer order history and loyalty summary where enabled.
- Add delete confirmations and permission checks.

Primary files:

- `ui/orders/OrdersScreens.kt`
- new `ui/orders/OrdersViewModel.kt`
- `ui/customers/CustomersScreens.kt`
- new `ui/customers/CustomerDetailScreen.kt`
- new `ui/customers/CustomerDetailViewModel.kt`

Tests:

- Every filter resets page 1.
- Old query results cannot overwrite the latest query.
- Customer history navigation.
- Loyalty enabled/disabled/error states.

Suggested commits:

- `feat(mobile-android): complete order filtering and sorting`
- `feat(mobile-android): add customer history and loyalty`

### PR 6 — Analytics parity

Depends on: PR 0. Start after the transactional P0 work is merged.

Work:

- Add typed analytics models/repository.
- Add today/7d/30d/year/custom-date state.
- Add revenue/order charts and deposit/operational summary.
- Add top-product/top-customer full lists and order drill-down.
- Enforce report permissions.

Primary files:

- `ui/overview/OverviewScreen.kt`
- new `ui/overview/OverviewViewModel.kt`
- new `ui/overview/components/`
- analytics repository/API adapter

Tests:

- Inclusive date range and local timezone conversion.
- Period changes clear stale totals and series.
- Permission matrix by role.
- Ranking drill-down query construction.

Suggested commits:

- `feat(mobile-android): add period-aware overview charts`
- `feat(mobile-android): add analytics ranking drill-down`

### PR 7 — Store information and export

Depends on: PR 0.

Work:

- Add complete supported outlet fields and read-only account/merchant context.
- Add public/affiliate links when present and permitted.
- Replace hard-coded month export with period/date selection.
- Use the authenticated exporter only; remove the browser-URL implementation.
- Gate export types by permission.

Primary files:

- `ui/settings/SettingsScreens.kt`
- `ui/settings/SettingsParity.kt`
- new settings ViewModels/repositories

Tests:

- Field round-trip and permission matrix.
- Authenticated download success/failure.
- Export type/period query generation.

Suggested commit:

- `feat(mobile-android): complete store info and authenticated exports`

### PR 8 — Inbox, localization, accessibility, and adaptive UI

Depends on: functional PRs above.

Work:

- Add notification read/unread toggle, confirmations, refresh, and badge sync.
- Move all remaining user-visible strings to English/Vietnamese resources.
- Add semantics/content descriptions and validate touch targets/font scaling.
- Add tablet/constrained-width layouts for core screens.
- Apply destructive confirmations consistently.

Tests:

- Inbox mutation updates list and unread count atomically.
- Resource/lint checks.
- Compose UI tests for core screen semantics.
- Manual phone/tablet, portrait/landscape, and large-font pass.

Suggested commits:

- `fix(mobile-android): synchronize inbox read state and badge`
- `fix(mobile-android): complete localization and accessibility`
- `feat(mobile-android): add adaptive tablet layouts`

## Decision gates before implementation

These questions must be resolved from the backend/product source before their PR
starts; they should not be guessed inside Android code:

1. Exact product pricing precedence between `FIXED`, `DAILY`, and sale price.
2. Payment/refund API contract and valid action per RENT/SALE status.
3. QR response format and whether bank-account configuration is mandatory.
4. Note-image upload/removal contract and attachment limit.
5. Loyalty feature flag and summary response contract.
6. Whether Android must support Bluetooth printing or intentionally remain
   network-only.

## Definition of done for every PR

- Same business result as iOS for the covered scenarios.
- Permission visibility and server authorization both verified.
- Loading, empty, offline, timeout, invalid-response, and retry states handled.
- Destructive actions require confirmation.
- No raw `JSONObject` crosses into a ViewModel or composable.
- New business rules have unit tests.
- API adapters have success and failure contract tests.
- Manual parity checklist for the affected flow is recorded.
- `:app:testDebugUnitTest`, `:app:lintDebug`, and `:app:assembleDebug` pass.
- README parity table is updated only after acceptance passes.
