# Mobile contract — Gia hạn gói (#1459)

Shared by iOS (reference) and Android so both say and do the same. Spec lines: `spec.md` 16–29.

## API the apps read

- `GET /api/subscriptions/status` (every shop role; open to expired shops). Fields used: `planId`, `planName`,
  `status` (ACTIVE | EXPIRED), `dbStatus` (TRIAL …), `daysRemaining`, `currentPeriodEnd`, `billingAmount`,
  `billingCurrency`, `limits` (JSON object), `features`, and the new `billingChannel`, `autoRenew`, `billingIssue`,
  `storeProductId`, `planTier`, `canRenew`, `canUpgrade`, `purchasablePlanIds`, `renewWindowDays`. Every new field is
  optional in the decoders (an older API answers without them → treat as `canRenew = canUpgrade = false`,
  `purchasablePlanIds = []`, `autoRenew = false`).
- `GET /api/plans` (MERCHANT only; open to expired shops): `data.plans[]` with `id`, `name`, `isPopular`, `limits`
  (JSON string), `features` (JSON string), `sortOrder`, new `storeProductIds` `{ semiAnnual, annual }` or null.
  The screen shows only plans with `storeProductIds`, ordered by `sortOrder`.
- Logout: the existing logout call. Nothing else from the expired screen.

## Store products

`anyrent_merchant_semi_annual`, `anyrent_merchant_annual` (Basic), `anyrent_professional_semi_annual`,
`anyrent_professional_annual` (Professional). The app takes the ids from `storeProductIds`; the managers also keep the
four ids as constants for offerings lookup. Google Play ids may come back as `id:basePlan`: match on the part before
`:`. Entitlement `merchant_subscription`. App user id `merchant_<merchantId>`.

## Pure logic (unit-tested on both platforms, same cases)

- `displayPlanName(name, isTrial)`: trial → "Dùng thử" / "Trial"; else the plan name ("Basic", "Professional").
- `statusLine`: active → "Hết hạn {dd/MM/yyyy} · còn {N} ngày"; 0 days → "Hết hạn {date} · ngày cuối"; after a
  confirmed renewal → "Dùng đến {date}". Expired → handled by the expired screen.
- `monthly(total, months)`: exact when `total % months == 0` ("166.500 ₫/tháng"), else rounded to the nearest 1.000
  for VND (to 0.01 for other currencies) with "≈" ("≈150.000 ₫/tháng").
- `savingsPercent(semi, annual)` = round((2·semi − annual) / (2·semi) · 100) when > 0, else none.
- `purchaseKind(selectedPlanId, currentPlanId, selectedTierRank, currentTierRank, isTrial)`:
  same plan and not trial → renew; selected rank > current rank → upgrade; else buy.
  Ranks: basic 1, professional 2, other 0. Tier from `storeProductIds`: the plan whose `annual` is
  `anyrent_professional_annual` is professional, `anyrent_merchant_annual` basic.
- `buttonTitle`: renew "Gia hạn {kỳ} · {số tiền}", upgrade "Nâng lên {gói} · {kỳ} · {số tiền}", buy
  "Mua gói {gói} · {kỳ} · {số tiền}".
- `newPeriodEnd(now, months)`: today's Vietnam day + months, day clamped to the month's last day → dd/MM/yyyy.
- `homeLine(role, status)`: MERCHANT, not expired, `canRenew`, `daysRemaining` 0…7 → "Gói còn {N} ngày" (0 → "Gói hết
  hạn hôm nay") with the link "Gia hạn"; else none.
- `isPeriodOver(currentPeriodEnd, now)`: end < now.
- `confirmed(before, after)`: after is not expired and (after end > before end, or after planId ≠ before planId).
- `screenMode(role, status, storeAvailable)`: owner + autoRenew → autoRenewing; owner + purchasable non-empty →
  purchase (or storeUnavailable when the store gives no products); owner otherwise → nothingToBuy; expired → expiredOwner /
  expiredStaff (non-MERCHANT roles).

## Strings (vi / en)

| Key (iOS `plan.*`, Android `plan_*`) | vi | en |
|---|---|---|
| title | Gói dịch vụ | Subscription |
| current | Đang dùng | Current |
| trial | Dùng thử | Trial |
| expiresDaysLeft | Hết hạn %@ · còn %d ngày | Expires %@ · %d days left |
| expiresLastDay | Hết hạn %@ · ngày cuối | Expires %@ · last day |
| validUntil | Dùng đến %@ | Valid until %@ |
| includes | Gồm: %@ | Includes: %@ |
| feature.phone | app điện thoại | phone app |
| feature.phoneWeb | app + web | app + web |
| feature.users | %d người dùng | %d users |
| feature.outlets | %d chi nhánh | %d branches |
| feature.products | %@ sản phẩm | %@ products |
| section.plan | Chọn gói | Choose a plan |
| section.period | Chọn kỳ gia hạn | Choose a period |
| popular | Phổ biến | Popular |
| months6 | 6 tháng | 6 months |
| months12 | 12 tháng | 12 months |
| perMonth | %@/tháng | %@/month |
| perMonthApprox | ≈%@/tháng | ≈%@/month |
| savings | ít hơn %d%% so với 2 kỳ 6 tháng | %d%% less than two 6-month periods |
| button.renew | Gia hạn %@ · %@ | Renew %@ · %@ |
| button.upgrade | Nâng lên %@ · %@ · %@ | Upgrade to %@ · %@ · %@ |
| button.buy | Mua gói %@ · %@ · %@ | Buy %@ · %@ · %@ |
| confirming | Đang xác nhận thanh toán… | Confirming payment… |
| disclosure | Kỳ mới tính từ hôm nay, dùng đến %@. Tự gia hạn mỗi %d tháng (%@) đến khi huỷ. | The new period starts today and runs until %@. Renews every %d months (%@) until cancelled. |
| manage | Quản lý / huỷ gói | Manage / cancel |
| restore | Khôi phục giao dịch | Restore purchases |
| terms | Điều khoản sử dụng | Terms of Use |
| privacy | Chính sách bảo mật | Privacy Policy |
| section.autoRenew | Tự gia hạn | Auto-renew |
| autoRenewOn | Tự gia hạn ngày %@ · %@ | Renews on %@ · %@ |
| autoRenewOnDate | Tự gia hạn ngày %@ | Renews on %@ |
| renewLater | Gia hạn được khi còn %d ngày. | You can renew when %d days are left. |
| currentRenewLater | Đang dùng · gia hạn được khi còn %d ngày | Current · renew when %d days are left |
| billingIssue | Chưa thu được tiền gia hạn. Mở Quản lý / huỷ gói để kiểm tra cách thanh toán. | The renewal payment failed. Open Manage / cancel to check your payment method. |
| storeUnavailable | Chưa mua được gói trong ứng dụng trên bản này. | In-app purchase is not available in this version. |
| retry | Thử lại | Try again |
| notConfirmed | Chưa nhận được xác nhận. | Payment not confirmed yet. |
| renewedUntil | Đã gia hạn đến %@. | Renewed until %@. |
| restored | Đã khôi phục giao dịch. | Purchases restored. |
| nothingToRestore | Không tìm thấy gói đã mua để khôi phục. | No purchase found to restore. |
| loadError | Không tải được thông tin gói. | Could not load the plan. |
| expired.title | Gói của shop đã hết hạn | Your shop's plan has expired |
| expired.line | %@ · hết hạn %@. Dữ liệu của shop vẫn được giữ. | %@ · expired %@. Your shop's data is kept. |
| expired.askOwner | Nhờ chủ shop gia hạn. | Ask the shop owner to renew. |
| logout | Đăng xuất | Log out |
| home.daysLeft | Gói còn %d ngày | Plan: %d days left |
| home.lastDay | Gói hết hạn hôm nay | Plan expires today |
| home.renew | Gia hạn | Renew |

## Layout (no icons; calm; mockup "Thiết kế đơn giản")

Grey background, white grouped cards (12 pt corners), section headers small uppercase grey. Brand colour only on the
radio dots, the button, links and the "Phổ biến" pill. Amount bold on the right of each period row; per-month price
13 pt grey under the period. Disclosure 13 pt under the button, normal contrast. Links centred:
"Quản lý / huỷ gói · Khôi phục giao dịch", then "Điều khoản sử dụng · Chính sách bảo mật" (13 pt).
Expired screen: no back button; title black; "Đăng xuất" centred at the bottom. Staff: title, line,
"Nhờ chủ shop gia hạn.", button "Thử lại", "Đăng xuất".

## Flow

- Expired gate: after login (login's `merchant.subscription.currentPeriodEnd` < now), at launch (cached end < now, then a
  status read; ACTIVE → tabs), on any 403 `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_PERIOD_ENDED`, `SUBSCRIPTION_CANCELLED`
  or `SUBSCRIPTION_PAST_DUE` (one gate, no per-screen alert for those codes; `SUBSCRIPTION_PAUSED` stays the admin's
  message). The gate leaves only when the status is neither expired nor PAST_DUE (`isBlocked`). PAST_DUE (`dbStatus`,
  period running): owner "Chưa thu được tiền gói" (`plan.paymentIssue.title` / `plan_payment_issue_title`), the payment
  line, Thử lại, Quản lý / huỷ gói, no plan to buy; staff "Nhờ chủ shop gia hạn.". The expired header also shows the
  payment line when `billingIssue` is true.
- Purchase: store sheet → poll status every 2 s for 20 s until `confirmed` → banner / snackbar "Đã gia hạn đến …"; in
  the expired mode go to Home and show it there. Timeout → "Chưa nhận được xác nhận." + Thử lại (poll again) +
  Khôi phục giao dịch.
- Manage: iOS `AppStore.showManageSubscriptions` (fallback `https://apps.apple.com/account/subscriptions`); Android
  `https://play.google.com/store/account/subscriptions?package=<applicationId>` plus `&sku=<id>` when the current product
  is known.
- Android Play upgrade: when the shop holds an active Play subscription to another of the four products, pass it as
  `oldProductId` with an immediate replacement mode so Google does not open a second subscription.

## Audit fixes (2026-11-03): A1, A3a, A5, A6, A11, A12

- **A3a app user id:** `merchant_<merchantId>` only when the app talks to the production API (host `api.anyrent.shop`);
  any other API (dev-api, a local API) uses `dev_merchant_<merchantId>`. Pure helper `appUserId(merchantId, apiBaseUrl)`.
- **A1 RevenueCat login is awaited:** before loading products, purchase and restore, the manager makes sure
  `appUserID` is the expected id: `logIn(expected)` up to 3 tries (1 s apart), then compares. When it is not the expected
  id it refuses (no store sheet) and the screen says `plan.accountNotReady` with Thử lại. Pure helper
  `storeAccountReady(current, expected)` = expected not empty and equal. The e2e StoreKit path (iOS) skips the check.
- **A5 upgrade while auto-renewing:** the status may now list higher plans while `autoRenew` is true (only when the
  plan renews on the device's own store; the server decides from `X-Device-Type`). Mode: auto-renewing with purchasable
  plans and store products → purchase (upgrade only). The current plan row is disabled with
  `plan.currentAutoRenew` "Đang dùng · tự gia hạn ngày %@".
- **A6 re-enable:** new optional status field `reenableAutoRenew`. When true, after the status card show a card:
  `plan.reenable.line` "Tự gia hạn đang tắt. Gói dùng đến %@." and a button `plan.reenable.button` "Bật lại tự gia hạn"
  that opens the manage page (iOS Apple sheet, Android Play subscriptions link). No disclosure for that. If no plan is
  purchasable, mode `reenableOnly` (no "Gia hạn được khi còn 7 ngày." line); else purchase mode for the upgrade.
- **A11 Android restore:** after a successful restore read the status first (as iOS): not expired → done (settings: the
  short "Đã khôi phục giao dịch." notice; expired gate: leave to Home with the renewed notice); still expired → confirming.
- **A12 wait ~60 s:** confirmation polls every 2 s for 60 s; while confirming, a calm line under the button
  `plan.confirmingHint` "Thường mất vài giây, có thể đến một phút."; then the existing slow state.

New strings (vi / en):

| Key (iOS `plan.*`, Android `plan_*`) | vi | en |
|---|---|---|
| accountNotReady | Chưa kết nối được tài khoản mua hàng. Thử lại sau giây lát. | Could not connect the purchase account. Try again in a moment. |
| reenable.line | Tự gia hạn đang tắt. Gói dùng đến %@. | Auto-renew is off. The plan runs until %@. |
| reenable.button | Bật lại tự gia hạn | Turn auto-renew back on |
| confirmingHint | Thường mất vài giây, có thể đến một phút. | Usually a few seconds, up to a minute. |
| currentAutoRenew | Đang dùng · tự gia hạn ngày %@ | Current · renews on %@ |

## A13 renewal credit (2026-11-03): "Gia hạn sớm không mất ngày"

- **Status field `storeRenewsAt`** (optional, ISO, null / missing on older APIs): the store's next charge while a store
  plan auto-renews. Access still runs to `currentPeriodEnd` (= `storeRenewsAt` + the shop's credit).
- **Auto-renew row:** "Tự gia hạn ngày <storeRenewsAt> · price" (fallback: `currentPeriodEnd`); the status card keeps
  "Dùng đến <currentPeriodEnd>". With a credit the two dates differ; without one they are the same as before. The plan
  row subtitle `plan.currentAutoRenew` uses the same date.
- **Disclosure under the buy button** (pure `disclosure(now, months, amount/status)`; charge = today's Vietnam day +
  months):
  - expired, no end, or the expired gate → `plan.disclosure` "Kỳ mới tính từ hôm nay, dùng đến <charge>. …";
  - days left and the purchase starts a new store subscription (trial, manual, Lemon, the other store) →
    `plan.disclosureCarry` with from = old end, end = charge + (old end − now), charge;
  - days left and an upgrade in the store that bills the plan (`billingChannel` = this device's store and a
    `storeProductId`) → credit = `currentPeriodEnd − storeRenewsAt` (0 when unknown); end = charge + credit;
    `plan.disclosureCredit` when the end day differs from the charge day, else `plan.disclosure`.
- Unit tests on both platforms: owner example, trial, other store, expired, same-store upgrade with and without credit,
  auto-renew row date, decoding with and without the field.

| Key (iOS `plan.*`, Android `plan_*`) | vi | en |
|---|---|---|
| disclosureCarry | Hạn mới tính tiếp từ %1$@, dùng đến %2$@. Tự gia hạn mỗi %3$d tháng (%4$@), lần trừ tiền tới ngày %5$@, đến khi huỷ. | The new period continues from %1$@ and runs until %2$@. Renews every %3$d months (%4$@), next charge on %5$@, until cancelled. |
| disclosureCredit | Kỳ mới tính từ hôm nay, dùng đến %1$@. Tự gia hạn mỗi %2$d tháng (%3$@), lần trừ tiền tới ngày %4$@, đến khi huỷ. | The new period starts today and runs until %1$@. Renews every %2$d months (%3$@), next charge on %4$@, until cancelled. |
