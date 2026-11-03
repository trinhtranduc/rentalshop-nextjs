# Spec — Gia hạn gói trên điện thoại (đợt 1)

Issue: #1459 · Status: accepted · Intent: ./intent.md

## Behavior

### Server rule (one place: `apps/api/lib/plan-renewal.ts`)

1. Store products map to a tier and months: `anyrent_merchant_semi_annual` → basic 6, `anyrent_merchant_annual` →
   basic 12, `anyrent_professional_semi_annual` → professional 6, `anyrent_professional_annual` → professional 12.
   A Google Play id with a base plan suffix (`anyrent_merchant_annual:annual`) maps like the bare id. Unknown → none.
2. A plan's tier comes from its name: "Basic" → basic, "Professional" / "Pro" → professional; other plans (Trial,
   Enterprise) have no tier and no store products. Rank: basic 1 < professional 2.
3. `renewalOffer` with the in-app plans (active, with a tier):
   - expired (period ended) → every in-app plan is purchasable; `canRenew` true when the current plan is in-app;
     `canUpgrade` true when a higher in-app plan exists (or the current plan has no tier).
   - trial (`status` TRIAL, not expired) → same as expired.
   - auto-renewing (store or Lemon, not expired) → nothing purchasable, `canRenew` and `canUpgrade` false.
   - active, 0 ≤ `daysRemaining` ≤ 7 → current plan + higher plans purchasable.
   - active, `daysRemaining` > 7 → only higher plans purchasable; `canRenew` false.
   - Professional (highest) active with > 7 days → nothing purchasable.
4. `GET /api/subscriptions/status` adds (old keys unchanged): `billingChannel` (`APP_STORE` | `PLAY_STORE` | `LEMON` |
   `MANUAL`; a row without a channel is `MANUAL`), `autoRenew` (stored flag and not expired), `billingIssue`
   (`billingIssueAt` set), `storeProductId` (or null), `planTier` (or null), `canRenew`, `canUpgrade`,
   `purchasablePlanIds`, `renewWindowDays` (7). A failure reading plans leaves `purchasablePlanIds` empty and the old
   answer intact.
5. `GET /api/plans` adds `storeProductIds` to each plan: `{ semiAnnual, annual }` for basic / professional, else null.

### Webhook `POST /api/webhooks/revenuecat`

6. Auth unchanged (Bearer `REVENUECAT_WEBHOOK_SECRET` when set; 401 otherwise).
7. Each `event.id` is processed once: a repeat answers 200 `duplicate` and changes nothing.
8. `INITIAL_PURCHASE` / `RENEWAL` of a known product: plan := the product's tier plan, status ACTIVE, period
   start = purchase, end = expiration (sandbox: purchase + months, as today), amount and currency = the real
   `price_in_purchased_currency` / `currency`, `billingChannel` from `store`, `storeProductId`,
   `storeOriginalTransactionId`, `autoRenew` true, billing issue cleared, cancellation cleared, one COMPLETED payment
   row (amount > 0), one Vietnamese history row. A `RENEWAL` on a row with no `storeProductId` keeps the plan.
9. `PRODUCT_CHANGE` to a higher tier switches the plan at once; to a lower or equal tier only logs "từ kỳ sau".
10. `CANCELLATION` with `cancel_reason` `CUSTOMER_SUPPORT` (refund): `currentPeriodEnd` = event time (never later than
    before), status EXPIRED (so the owner may buy again; CANCELLED would answer 403 "contact support"), `autoRenew` false, the payment with that `transaction_id` becomes REFUNDED. Any other
    `CANCELLATION`: `cancelAtPeriodEnd` true, `autoRenew` false, period unchanged.
11. `UNCANCELLATION`: `autoRenew` true, cancellation and billing issue cleared. `BILLING_ISSUE` from the App Store or
    Google Play ("trừ tiền lỗi: vẫn dùng tới hết kỳ"): `billingIssueAt` set, status unchanged (never PAST_DUE, which
    `authenticateRequest` blocks on every route; an old PAST_DUE row becomes ACTIVE), auto-renew unchanged, and
    `grace_period_expiration_at_ms` later than `currentPeriodEnd` extends it. RENEWAL / UNCANCELLATION / PRODUCT_CHANGE
    clear the flag. Other RevenueCat stores keep PAST_DUE. `EXPIRATION`: `autoRenew` false; status EXPIRED only after the
    period ended (as today).
12. Unknown product, unknown `app_user_id` or unknown merchant: 200 `ignored`, nothing written except the event id.
13. A processing error releases the event id and answers 500 so RevenueCat retries.
14. History text is plain Vietnamese with VN dates, e.g. "Gia hạn gói Basic 12 tháng qua App Store. Dùng đến
    02/11/2027." No product ids or SDK names.

### Audit fixes (2026-11-03)

14a. A2: without `REVENUECAT_WEBHOOK_SECRET` the webhook answers 503 and logs; the header must be exactly
     `Bearer <secret>` (constant-time compare).
14b. A3: `REVENUECAT_APP_USER_ID_PREFIX` (unset = `merchant_`, production; the dev API sets `dev_merchant_`): each API only
     serves its own prefix. Production takes SANDBOX events only for `REVENUECAT_SANDBOX_MERCHANT_IDS` (comma list of
     Merchant.id, e.g. `2` or `2,5`, spaces trimmed, garbage ignored). Sandbox events never write a payment.
14c. A4: the shop comes from `app_user_id`, then `original_app_user_id`, then `aliases`; TRANSFER moves the store plan to
     the receiving shop (the old shop keeps its days, stops renewing).
14d. A7: SUBSCRIPTION_EXTENDED moves `currentPeriodEnd` to the new expiration (never shorter).
14e. A8: `Subscription.lastStoreEventAt`; an event older than it is skipped (`stale`).
14f. A9: an `ignored_*` event releases its id; "no active plan for the tier" answers 500.
14g. A10: a refund ends access only when the refunded expiration is within a day of `currentPeriodEnd`; manual renewals
     (`payments/manual`, admin extend, `subscriptions/[id]/extend`, `subscriptions/[id]/renew`) set MANUAL / no auto-renew /
     no store product.
14h. A5, A6: the status reads the device store from `X-Device-Type`; auto-renewing on that store → higher plans offered;
     auto-renew off on that store → `reenableAutoRenew` true and the same plan not purchasable.

### Lemon Squeezy webhook

15. `subscription_*` events also write `billingChannel` LEMON, `autoRenew` (active and not cancelled) and
    `billingIssueAt` (past_due). Signature check unchanged.

### Apps (iOS reference, Android matches)

16. Settings: Gói dịch vụ row on for MERCHANT in old Settings and new Settings (opens the screen). Other roles keep
    today's read-only row in new Settings and no row in old Settings.
17. Gói dịch vụ screen (owner): status card "<Gói> · Đang dùng" / "Dùng thử", "Hết hạn dd/mm/yyyy · còn N ngày";
    CHỌN GÓI from `GET /api/plans` plans with `storeProductIds`, "Phổ biến" when `isPopular`, rows outside
    `purchasablePlanIds` disabled with "Đang dùng · gia hạn được khi còn 7 ngày"; CHỌN KỲ GIA HẠN from the store
    products of the selected plan: amount bold, per-month grey ("166.500 ₫/tháng"; 12 months
    "≈150.000 ₫/tháng · ít hơn N% so với 2 kỳ 6 tháng"); one button; disclosure; links.
18. Button title: same plan and not trial → "Gia hạn {kỳ} · {số tiền}"; higher plan → "Nâng lên {gói} · {kỳ} · {số tiền}";
    otherwise "Mua gói {gói} · {kỳ} · {số tiền}".
19. Disclosure: "Kỳ mới tính từ hôm nay, dùng đến {dd/mm/yyyy}. Tự gia hạn mỗi {N} tháng ({số tiền}) đến khi huỷ." with
    the end = today (VN day) + N months.
20. Auto-renewing: no plan or period choice, "Gồm: …", "Tự gia hạn ngày {dd/mm/yyyy} · {số tiền}", Quản lý / huỷ gói,
    Khôi phục giao dịch, Điều khoản · Bảo mật.
21. Nothing purchasable and not auto-renewing: status, "Gồm: …", "Gia hạn được khi còn 7 ngày.", links.
22. Billing issue: the status card adds "Chưa thu được tiền gia hạn. Mở Quản lý / huỷ gói để kiểm tra cách thanh toán."
23. No store (no RevenueCat key or no offerings): "Chưa mua được gói trong ứng dụng trên bản này." instead of the period
    list and button; Thử lại stays; no crash.
24. Purchase: store sheet → button "Đang xác nhận thanh toán…" (disabled) while polling status (every 2 s, 20 s) until
    the period end moves past the old one or the plan changes → banner (iOS) / snackbar (Android) "Đã gia hạn đến
    {dd/mm/yyyy}." → screen redrawn. Timeout → "Chưa nhận được xác nhận." with Thử lại and Khôi phục giao dịch.
    Cancel → nothing. Store error → its message.
25. Restore: RevenueCat restore then the same confirmation; nothing to restore → "Không tìm thấy gói đã mua để khôi phục."
26. Manage: iOS opens Apple's subscription management; Android opens
    `https://play.google.com/store/account/subscriptions?package=anyrent.shop` (with `sku` when known).
    Terms `https://www.anyrent.shop/terms`, privacy `https://www.anyrent.shop/privacy`.
27. Expired screen (no back button) appears after login when the login says the period ended, at launch when the saved
    period end passed or status says EXPIRED, and on any 403 `SUBSCRIPTION_EXPIRED` (what `authenticateRequest` answers
    today), `SUBSCRIPTION_PERIOD_ENDED`, `SUBSCRIPTION_CANCELLED` or `SUBSCRIPTION_PAST_DUE` (not `SUBSCRIPTION_PAUSED`).
    A PAST_DUE shop (Lemon / Stripe) gets "Chưa thu được tiền gói" with the payment line, Thử lại and Quản lý / huỷ gói
    (nothing to buy); staff ask the owner; the gate stays up while the status says PAST_DUE:
    - owner: "Gói của shop đã hết hạn" (black), "{Gói} · hết hạn {dd/mm/yyyy}. Dữ liệu của shop vẫn được giữ.", the plan
      chooser of 17–19, links, Đăng xuất; paid and confirmed → Home with the "Đã gia hạn đến …" banner / snackbar.
    - other roles: same two lines, "Nhờ chủ shop gia hạn.", Thử lại (reads status; active → Home), Đăng xuất.
    - It calls only `GET /api/subscriptions/status`, `GET /api/plans` (owner) and logout.
28. Home (owner): "Gói còn N ngày · Gia hạn" ("Gói hết hạn hôm nay · Gia hạn" at 0) when `canRenew` and the period is
    active; tapping opens the screen. Hidden otherwise and for other roles.
29. Plan and status text in Vietnamese / English from the app strings, never the raw API value.

## Out of scope

Web and Lemon Squeezy checkout (phase 2), admin screens, store / RevenueCat dashboard setup, real prices, add-on billing,
a staff read-only plan screen outside the expired state.

## API and data

- Migration `subscription_store_billing`: `Subscription.billingChannel TEXT NULL`, `storeProductId TEXT NULL`,
  `storeOriginalTransactionId TEXT NULL`, `autoRenew BOOLEAN NOT NULL DEFAULT false`, `billingIssueAt TIMESTAMP(3) NULL`;
  table `BillingWebhookEvent (id, provider, eventId, eventType, merchantId, createdAt)` unique (provider, eventId).
- Status adds the fields of 4 for MERCHANT and outlet roles (same scope as today). Plans add `storeProductIds`.
- Webhooks are server-to-server; no app reads them.

## Acceptance

- [x] Each behavior line has a test, a command, or a UI check named in `plan.md`
- [x] iOS and Android called out (API shape and business rule change)
- [x] New user-facing strings: iOS en / vi-VN, Android values / values-vi (web does not share them)
- [x] Vietnamese civil days for days left and the new end date; roles: only MERCHANT buys
