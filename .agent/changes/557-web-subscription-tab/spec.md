# Spec — #557 Gói dịch vụ shows plan, expiry, usage and history

Issue: #557 · Status: accepted · Intent: ./intent.md

## Behavior

1. The tab is drawn with `SectionCard` on shell tokens; no `.ar-legacy` wrapper and no shared `SubscriptionSection`.
2. Plan card: plan name; "Trial" (any case) reads "Dùng thử" in Vietnamese.
3. Status tag, first match wins: `status = EXPIRED` → Hết hạn; `dbStatus = PAUSED` → Tạm dừng;
   `dbStatus = CANCELLED` or `cancelAtPeriodEnd` or `canceledAt` → Đã huỷ; `dbStatus = PAST_DUE` → Chờ thanh toán;
   `isExpiringSoon` → Sắp hết hạn; `dbStatus = TRIAL` → Dùng thử; otherwise Đang dùng.
4. Price: `billingAmount` in `billingCurrency` when > 0, else `planPrice` in `planCurrency`; 0 or missing →
   "Miễn phí". Interval suffix: month → "/tháng", count n → "/n tháng", quarter → "/3 tháng",
   semi_annual → "/6 tháng", year / annual → "/năm".
5. Expiry: "Hết hạn T5 19/11/2026 · còn 44 ngày" (trial: "Dùng thử đến …"; expired: "Đã hết hạn …";
   cancelled: "Dùng được đến …"). The day is the Vietnam civil day of `currentPeriodEnd`. Days left are
   `daysRemaining` from the API; 0 / null shows no "còn n ngày".
6. When `cancelAtPeriodEnd` is true a note says the plan will not renew after that day.
7. Usage rows for outlets, users, products, customers, orders: "used / limit" with a bar. Over the limit
   → red text and bar. Limit -1 → "Không giới hạn" with no bar. Limit missing → row hidden. Usage missing
   (orders today) → only the limit ("Tối đa 2.000").
8. History merges activities and non-zero payments, newest first by instant; each row shows the Vietnam
   civil day (weekday + dd/mm/yyyy), a title, and a detail line. A completed payment within 5 minutes of a
   paid activity (extension, plan change, app purchase, checkout) is the same event and is folded into that row.
9. Activity titles: `subscription_created` → "Bắt đầu dùng thử" (trial plan / TRIAL status) or "Bắt đầu gói X";
   `subscription_plan_changed` / `plan_changed` → "Nâng cấp lên X" / "Chuyển xuống X" / "Đổi sang gói X";
   `subscription_extended` → "Gia hạn n ngày"; `MANUAL_EXTENSION` → "Gia hạn n tháng";
   `IAP_INITIAL_PURCHASE` → "Mua gói trên ứng dụng"; `IAP_RENEWAL` → "Gia hạn trên ứng dụng";
   `stripe_checkout_completed` → "Thanh toán gói"; `subscription_cancelled` → "Huỷ gói";
   `subscription_paused` → "Tạm dừng gói"; `subscription_resumed` → "Tiếp tục gói";
   `subscription_expiry_reminder_sent` → not shown; anything else → "Cập nhật gói" (never the raw code).
10. Payment rows: title by type (SUBSCRIPTION_PAYMENT → "Thanh toán gói", PLAN_CHANGE → "Thanh toán đổi gói",
    PLAN_EXTENSION → "Thanh toán gia hạn"), detail "amount · method"; a status other than COMPLETED is shown
    (Đang chờ / Thất bại / Đã hoàn tiền / Đã huỷ).
11. History empty → "Chưa có thay đổi nào." History request fails → the plan card still shows and the
    history card says it could not load.
12. Upgrade / extend stay hidden behind `SUBSCRIPTION_UPGRADE_EXTEND_ENABLED = false`; `?checkout=` and
    `?action=` are still read and cleared through `settingsHref`.
13. Works in light and dark, 1440 and 390 widths, no horizontal scroll.

## Out of scope

- Turning upgrade / extend on, plan picker, invoices, the admin app, the shared `packages/ui` section,
  the old `/subscription` page.
- Any API or response change; usage of orders (the API does not send it).

## API and data

None. Reads `GET /api/subscriptions/status`, `GET /api/subscriptions/{id}/activities`,
`GET /api/subscriptions/{id}/payments` (MERCHANT scoped to own merchant by the API). No CUIDs are shown.

## Acceptance

- [x] Behaviors 2–10 have tests in `tests/web-subscription-model.test.ts` (both TZ)
- [x] 1, 11–13 checked in the browser (screenshots in the PR)
- [x] No API shape or business rule change → no iOS / Android change
- [x] New strings under `settings.web.subscription` in `en` and `vi` (the only locales with `settings.json`)
- [x] Vietnam civil days hold
