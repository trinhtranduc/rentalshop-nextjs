# Spec — Cancel after an App Store upgrade; no auto-renew card on the plan screen

Issue: #1466 · Status: in-progress · Intent: ./intent.md

## Behavior

API (`POST /api/webhooks/revenuecat`):

1. "Same store subscription" (used by CANCELLATION, its refund branch, EXPIRATION, SUBSCRIPTION_EXTENDED):
   - a row without `storeProductId` counts as the same (unchanged);
   - an App Store event (`store` APP_STORE / MAC_APP_STORE) with `original_transaction_id`, on a row with
     `storeOriginalTransactionId`: the same when the two ids are equal, whatever the product;
   - otherwise (Google Play, an id missing): the same when the event's product is the stored product (unchanged).
2. RENEWAL Basic → PRODUCT_CHANGE Professional → CANCELLATION `UNSUBSCRIBE` with the Basic product id and the same
   original transaction id: `autoRenew` false, `cancelAtPeriodEnd` true, `canceledAt` set, `currentPeriodStart` and
   `currentPeriodEnd` unchanged, plan Professional, status ACTIVE, history "Đã tắt tự gia hạn trên App Store…". The same
   sequence as on dev (sandbox, `dev_merchant_30`) gives the same result.
3. Same sequence then EXPIRATION (Basic id, same id): before the period end, auto-renew off and access kept; after it,
   status EXPIRED.
4. Same sequence then a refund (CANCELLATION + `CUSTOMER_SUPPORT`, Basic id, same id) of the period in use: handled as a
   refund of the current period (A10 / A13). A refund whose expiration is not the period in use (a Professional RENEWAL
   came after) only marks the payment.
5. Same sequence then SUBSCRIPTION_EXTENDED (Basic id, same id): the period moves to the new expiration + credit.
6. An App Store event with a different original transaction id (another Apple ID's subscription) stays "another
   product": nothing changes.
7. Google Play: Basic → PRODUCT_CHANGE → INITIAL_PURCHASE Professional (new order id), then CANCELLATION / EXPIRATION of
   the Basic product (old order id): nothing changes (unchanged).

Apps (iOS reference, Android matches):

8. Plan screen: no "TỰ GIA HẠN" header and no "Tự gia hạn ngày … · price" card in any mode.
9. Status card: "<Plan> · Đang dùng", "Dùng đến …", "Gồm: …" as today.
10. Footer: "Quản lý / huỷ gói · Khôi phục", "Điều khoản · Bảo mật" as today. "Bật lại tự gia hạn" and the purchase
    disclosure stay where they are.
11. CHỌN GÓI, the current plan's row while it cannot be bought: "Đang dùng" when auto-renewing (was "Đang dùng · tự gia
    hạn ngày …"); "Đang dùng · gia hạn được khi còn N ngày" otherwise (unchanged).
12. Strings removed: iOS `plan.section.autoRenew`, `plan.autoRenewOn`, `plan.autoRenewOnDate`, `plan.currentAutoRenew`;
    Android `plan_section_auto_renew`, `plan_auto_renew_on`, `plan_auto_renew_on_date`, `plan_current_auto_renew`
    (en + vi). `autoRenewDate` removed from both logic files.

## Out of scope

- Storing the pre-change product, new columns, Lemon Squeezy, `storeRenewsAt` (kept in the status response; the
  disclosure still reads it).
- Web plan screens.

## API and data

No field, route, status code, schema or env change. Only which events reach the existing handlers after an App Store
upgrade. Auth unchanged (Bearer `REVENUECAT_WEBHOOK_SECRET`).

## Acceptance

- [ ] 1–7: `tests/api/revenuecat-webhook-cancel-after-upgrade.test.ts`, `tests/api/revenuecat-webhook.test.ts`
- [ ] 8–12: iOS `POS ADBDTests` (`PlanRenewalLogicTests`), Android `PlanRenewalTest`, screenshots on both platforms
- [ ] No new strings (only removals); en + vi files lint
- [ ] Plan-renewal and RevenueCat suites green under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
