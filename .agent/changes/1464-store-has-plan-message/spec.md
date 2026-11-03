# Spec — Store already has a plan: calm message; compact plan-screen links

Issue: #1464 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `storeKeptCurrentPlan(bought, entitlementActive, entitlementProductId)` is true only when the entitlement is active
   and its base product id differs from the bought base id (iOS `PlanRenewalLogic`, Android `PlanRenewal`).
2. The slow state after a purchase shows the store-has-plan text when (1) was true for that purchase, else
   "Chưa nhận được xác nhận.". Thử lại and Khôi phục giao dịch stay. A new buy or restore clears the flag.
3. The confirmation polling (2 s, 60 s) is unchanged; a server confirmation still finishes the purchase.
4. `footerLinks(status)` = manage + restore when `billingChannel` is this device's store (`APP_STORE` iOS, `PLAY_STORE`
   Android), else restore only. Trial, MANUAL, LEMON, the other store, missing channel → restore only.
5. Purchase, expired-owner, auto-renewing, nothing-to-buy and re-enable screens end with at most two link lines:
   "Quản lý / huỷ gói · Khôi phục" or "Khôi phục giao dịch", then "Điều khoản · Bảo mật" (same URLs). The auto-renew
   card keeps only its line (its manage row moves to the footer, so the link is not shown twice).
6. Staff, store-unavailable and load-error screens unchanged apart from the shorter legal labels. PAST_DUE owner keeps
   its manage link.

## Out of scope

Skipping the 60 s wait; a link to the Lemon portal or the other store (#1461 item 4); API changes.

## API and data

None.

## Acceptance

- [ ] (1), (2) message choice and (4) links per channel: unit tests on iOS and Android, red first
- [ ] iOS `POS ADBDTests` + Development build; Android `:app:testDebugUnitTest :app:assembleDebug`
- [ ] Strings vi + en on both apps (the apps have no zh/ko/ja)
- [ ] `git diff --name-only origin/dev...HEAD -- apps/api packages prisma` is empty
