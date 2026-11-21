# Spec — Thanh toán gói trên web qua Polar

Issue: #1631 · Status: accepted · Intent: ./intent.md

## Behavior

Dates are Vietnam civil days; amounts in đồng. Polar amounts are minor units (VND has none: 1799000 = 1.799.000 ₫).

1. `POLAR_PRODUCTS` (`professional_semi_annual=<id>,professional_annual=<id>,basic_…`) maps Polar products to a tier and
   6 / 12 months; unknown keys and blank ids are ignored.
2. `GET /api/polar/offers` (merchant): `{ enabled, offers: [{ planId, tier, interval, months, amount, currency, productId }],
   renewal }`. `enabled` false when `POLAR_ACCESS_TOKEN` or `POLAR_PRODUCTS` is unset. The amount is the product's fixed
   price (VND price first). A product whose interval does not match its key is left out.
3. `POST /api/polar/checkout { planId, interval, successUrl }` (MERCHANT, works when expired) creates a Polar checkout with
   `external_customer_id = merchant_<id>`, metadata `{ merchantId, planId, interval }`, the offer's currency, and returns
   `{ url }`. Refused when: Polar is off (`POLAR_NOT_CONFIGURED`); the shop auto-renews on the App Store / Google Play
   (`SUBSCRIPTION_RENEWS_IN_STORE`); the shop auto-renews on Polar (`POLAR_MANAGE_IN_PORTAL`); the plan has no offer or is
   not purchasable by `renewalOffer` with the device store `POLAR` (`PLAN_NOT_PURCHASABLE`).
4. `POST /api/polar/portal { returnUrl }` (MERCHANT) returns the customer portal url for `merchant_<id>`;
   `POLAR_CUSTOMER_NOT_FOUND` when Polar has no such customer.
5. `POST /api/webhooks/polar` verifies the Standard Webhooks signature (`webhook-id`, `webhook-timestamp` within 5 minutes,
   `webhook-signature` v1 HMAC-SHA256 of `id.timestamp.body`; key = the secret's UTF-8 bytes or the base64 after
   `whsec_`). Unset secret → 503; bad signature → 401. Each `webhook-id` runs once (`BillingWebhookEvent`, provider
   `POLAR`); an ignored event releases its id; a processing error answers 500. An ignored event answers 200.
6. Case 1 — Shop Hoa, MANUAL Pro until 31/01/2027 23:59:59 VN, buys Pro 12 months on 21/11/2026 (Polar period to
   21/11/2027): ACTIVE, POLAR, auto-renew, end 31/01/2028 (credit 71 days), `storeOriginalTransactionId` = the Polar
   subscription id, `storeProductId` = the product id. `order.paid` 1799000 VND → one COMPLETED payment
   (`POLAR`, 1.799.000 VND, `transactionId` = order id; a repeated order is not recorded twice).
   Renewal (`subscription.updated`, period to 21/11/2028) → end 31/01/2029, credit kept.
7. Case 2 — Shop Lan, TRIAL until 05/12/2026, buys Pro 6 months on 25/11/2026 (Polar to 25/05/2027) → end 04/06/2027.
8. Case 3 — `cancel_at_period_end` true → auto-renew off, `cancelAtPeriodEnd` true, end unchanged, still ACTIVE; back to
   false → auto-renew on again.
9. Case 4 — `subscription.past_due` → `billingIssueAt` set, status and end unchanged (no 403). Revoked / canceled with
   `ended_at` → MANUAL with the same end (no store fields, no credit); EXPIRED only if that end has passed.
10. Case 5 — `order.refunded` (full) of the period in use on 21/12/2026 → the payment REFUNDED with `refundedAt`; the shop
    goes back to period start + credit = 31/01/2027, MANUAL, auto-renew off. Refund date after that end → EXPIRED now.
    A partial refund only notes the payment.
11. Case 6 — events of another Polar subscription than the stored one change nothing unless it is active (a new purchase);
    a stored MANUAL / store row only changes on an active Polar subscription.
12. A plan switch in the portal (`subscription.updated` with another product) moves the plan to the product's tier and
    keeps the credit.
13. An event older than the last applied one (`lastStoreEventAt`) is skipped.
14. Credit and admin extensions treat POLAR like a store channel: `storeCreditForPurchase`, `isRunningStoreSubscription`,
    `manualExtensionBilling`, `storeRenewsAt`.
15. `GET /api/subscriptions/status` returns `billingChannel: "POLAR"` for a Polar row (other values unchanged).
16. Admin revenue counts `POLAR` payments as `CARD`.
17. Web `/plans`: with Polar on, plans with offers show the offer price for 6 / 12 months and the buy button opens the
    Polar checkout; plans without an offer say they are bought in the app; a Polar auto-renewing shop gets "Quản lý / đổi
    gói" (portal). With Polar off, the page is as before.
18. Web Cài đặt → Gói dịch vụ: channel POLAR reads "Thẻ (Polar)" and has "Quản lý / huỷ gói" (portal). The expiry bar
    opens `/plans` when Polar is on.

## Out of scope

Transfer price on the web; iOS / Android; moving Lemon subscriptions; removing Lemon code; Polar trials; seat / usage
pricing; Polar checkout embedded in the page.

## API and data

- New routes: `GET /api/polar/offers`, `POST /api/polar/checkout`, `POST /api/polar/portal`, `POST /api/webhooks/polar`
  (public by the existing `/api/webhooks` prefix).
- `billingChannel` value `POLAR`; `PaymentMethod` enum value `POLAR` (migration, additive).
- Env (optional; unset = off): `POLAR_SERVER` (`sandbox` default | `production`), `POLAR_ACCESS_TOKEN`,
  `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCTS`; `POLAR_API_BASE_URL` overrides the base URL (local e2e only).
- External ids stay numeric; Polar sees `merchant_<Merchant.id>` (the same id RevenueCat uses).

## Acceptance

- [ ] Behaviors 1, 5–16 have Jest tests (`tests/polar-billing.test.ts`, `tests/plan-renewal-credit.test.ts`)
- [ ] Behaviors 2–4, 17, 18: headed Chrome e2e against a local API and a fake Polar server
- [ ] iOS / Android: no change (compat table in the issue and PR)
- [ ] New strings in all 12 locales
- [ ] Vietnam civil days in the case dates; TZ=UTC and TZ=Asia/Ho_Chi_Minh
