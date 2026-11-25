# Spec (#1661)

1. `SettingsPanel` không render `BlockOldAppsSection` và không tải hồ sơ chỉ vì thẻ này (`needsProfile` của tab `merchant` chỉ còn chờ cờ "cho tạo đơn khi trùng lịch").
2. Các thẻ khác của tab `merchant` không đổi.
3. `BlockOldAppsSection`, `blockOldAppsFlag` và `settings.web.blockPricing.*` (12 ngôn ngữ) giữ nguyên.
4. API không đổi: `PUT /api/settings/merchant { blockPricing }`, `GET /api/users/profile` `merchant.blockPricing`, `POST /api/orders`.

Test: `tests/web-settings-hide-old-apps.test.ts` (1, 2, 3); các test API `merchant-block-pricing-setting` và `api-compat/order-block-pricing` chứng minh (4).
