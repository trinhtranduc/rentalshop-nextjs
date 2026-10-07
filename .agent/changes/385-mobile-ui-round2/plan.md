# Plan — Mobile UI round 2 (phases 5–9)

Issue: #385 · Phases: #386 (5), #387 (6), #388 (7), #389 (8 API), #390 (8 mobile), #391 (9)

## Context
Phases 0–4 of the mobile redesign are merged into `dev`: #376, #377, #378/#380, #379, #382, plus API #381 and home #384.

Two groups of boards are now approved ("CHỐT") on the canvas https://claude.ai/artifact/DY4DRyDH8Kps9gAw9FExLx, but have no code yet:
- **Auth:** Đăng nhập, Tạo cửa hàng ×2, Quên mật khẩu ×2.
- **Customers:** Giới thiệu, Chọn khách, Khách mới, Khách hàng, Chi tiết khách.

An audit also found gaps against boards that are already implemented.

Goal of this round:
- every approved board ships on iOS and Android;
- the phase 0–4 gaps are filled;
- then real testing on dev and a staged release.

## Rules (same as round 1)
- **Flags:** each group sits behind its own flag; with the flag off, the old screens stay.
- **API:** changes are additive only, so installed apps keep working.
- **Delivery:**
  - One PR per phase, iOS and Android together.
  - Unit tests for pure logic.
  - Manual run on a dedicated simulator/AVD against a local API, never on `vm_pos` / `vm_kitchen`.
- **SDLC:** issue first; change folder `.agent/changes/<issue>-<slug>/` with intent, spec and plan.
- **Agents:** they work in their own worktrees, commit without pushing, and use separate simulators, ports and accounts. I review the screenshots and diff, then open the PR.

## Step 0 — docs and issues (first, no code)
- Docs PR adding `.agent/changes/<n>-mobile-ui-round2/{intent,spec,plan}.md` with this plan.
- Issues for phases 5, 6, 7, 8 (API), 8 (mobile) and 9.
- Each issue links the canvas boards.

## Phase 5 — Auth (flag `newAuth`)
**Screens**
- Đăng nhập: email, password with show toggle, Quên mật khẩu, Tạo cửa hàng mới.
- Tạo cửa hàng step 1: store name, phone, address, "Bạn cho thuê gì?" chips.
- Tạo cửa hàng step 2: name, email, password, confirm, terms. Errors show inline.
- Quên mật khẩu, then Đã gửi email (with Gửi lại).

**API**
- Use the existing `auth/login` (the mobile login path from #344), `auth/register` and `auth/forgot-password`. The register payload is unchanged; the old 3 steps are merged into 2.
- Small additive change: add `newAuth` and `newCustomers` to `MOBILE_FEATURE_KEYS` in `apps/api/lib/mobile-app-config.ts`. Add the same keys to iOS `Model/AppConfig.swift` (`MobileFeature`) and Android `domain/appconfig/AppConfigModels.kt`.

**Care**
- The flag is read from the cached app-config before login.
- Keep the refresh-token storage and the "signed in on another device" message from #346 unchanged.

**Code**
- iOS: new `Viewcontrollers/Auth/v2/*`, swapped where `AppDelegate.loadLogin` builds the login screen.
- Android: new `ui/auth/v2/*`, swapped in `AnyRentNavHost` at the auth route.

## Phase 6 — Onboarding and customers (flag `newCustomers`; onboarding rides `newAuth`)
**Screens**
- **Giới thiệu:** 3 steps. Shown once after the first sign-up or login. Has Bỏ qua.
- **Chọn khách:** sheet opened from the new cart (#373). Search by name or phone, a "Khách mới" row, recent customers.
- **Khách mới:** phone and name required, note optional, "Lưu và chọn". If the phone already exists, offer that customer instead of creating a duplicate.
- **Khách hàng list:** from Settings; search and +. This adds the missing iOS customer list and the iOS Settings row.
- **Chi tiết khách:**
  - tier badge and a call button;
  - Số đơn, Tổng chi, Đang thuê, from `customers/{id}/orders` `summary`;
  - recent orders;
  - "Tạo đơn cho khách này".

**API (existing)**
- `GET customers?q`, `POST customers`, `GET customers/{id}`, `GET customers/{id}/orders`.
- Check role rules: staff may create, not delete.

## Phase 7 — Gaps without API change
**Product detail**
- 7-day free strip, from the existing `products/{id}/availability-calendar`.
- Order chips: Sắp tới / Đang thuê / Đã xong.
- Remove the iOS left border on order rows.

**Overview**
- Tapping a figure opens the matching list. Reuse the existing `OverviewRankingOrdersViewController` / Android overview-orders routes.

**Settings**
- Counts next to Khách hàng and Người dùng, from the list `total`.

**Fixes**
- English plural: "1 days late".
- Android `cancel` string swapped between `values` and `values-vi`.
- iOS app-config bypasses `URLCache` (`reloadIgnoringLocalCacheData`), so flags apply on the next launch.
- Android auto-deposit counts every item, as iOS does.
- Old note editors go to 5 photos, only after the user's `feat/note-images-limit` work is merged.

## Phase 8 — Gaps that need API (API PR first)
**API, one PR, additive**
- `calendar/orders/by-date` rows gain `amountDue`, `refundDue` and `lateFee`, via `computeOrderBalance` (`apps/api/lib/order-balance.ts`).
- Product soft delete with a 409 when the product has open orders (the pending "PR 1b"). Fix the web product detail first.

**Mobile, after the API PR**
- Calendar rows show "còn thu" / late fee.
- Product detail gets Xóa.
- Order detail gets "Gia hạn": a new return date through the existing `PUT /api/orders/:id`, with an availability check first.

**Deferred**
- A per-item hand-over/return checklist needs a schema migration. Not in this round unless the user asks.

## Phase 9 — Real testing and release
1. **Clean local DB test data** (products 62–64, orders 148148/786100/341205/702293, statuses of 14/29/69/82/87), only after the user agrees.
2. **The user sets `MOBILE_FEATURES` on Railway dev.** Then test on real iOS and Android devices.
3. **`dev` → `main-real`** only on the user's go. I never merge to production.
4. **App builds:** TestFlight and Play internal, then the stores.
5. **Turn flags on in production in stages:**
   1. Orders + Order detail;
   2. Products;
   3. Calendar / Overview / Settings;
   4. Customers;
   5. Auth last.
   - Each flag can be switched off at once.
6. **Raise `minVersion`** only when most devices report the new `X-App-Version`.

## Order and parallelism
- **Wave A** (parallel agents):
  - Phase 5: simulator iPhone 17 Pro, AVD `anyrent_371`, API port 3178, a fresh register flow plus `admin.outlet1`.
  - Phase 6: simulator iPhone 17, AVD `anyrent_373`, port 3179, `merchant2` / `staff.outlet2`.
  - String-file conflicts are resolved when the second one merges.
- **Wave B:** phase 7, alongside the phase 8 API PR.
- **Wave C:** phase 8 mobile, then phase 9.

## Verification (each phase)
- iOS: `xcodebuild … -only-testing:"POS ADBDTests" test` is green.
- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug` is green.
- API phases: `cd tests && yarn test` shows no new failing suite against the dev baseline, plus API type-check and build.
- Manual run of each new screen, flag on and off, as merchant and as staff.
- I review the screenshots before the PR, then make a canvas-vs-app check.

## Risks
- **Auth is the critical path.** A login bug locks everyone out, so `newAuth` is enabled last and can be switched off at once.
- **Duplicate customers by phone.** Handled in Khách mới.
- **String/pbxproj conflicts in parallel PRs.** Union-resolve them, then rebuild.
