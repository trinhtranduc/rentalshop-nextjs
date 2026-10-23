# Spec — E2e Hiện giá trên trang shop

Issue: #1177 · Status: accepted · Intent: ./intent.md

## Behavior

1. WEB-UI-SET-01 opens the settings tab “Trang shop công khai” (`?settings=public-page`) and the copy “Hiện giá trên trang shop” is visible.
2. WEB-UI-SET-11 requires the merchant to have a `tenantKey`.
3. With the switch ON, `GET /api/public/{tenantKey}/products` keeps `merchant.showPublicPrice` true and a non-null `rentPrice`; the first product card shows a money amount, not “Liên hệ”.
4. Turning the switch OFF sends `PUT /api/settings/merchant` with body exactly `{ "showPublicPrice": false }` and HTTP 200. The JSON `code` is not `BUSINESS_NAME_REQUIRED`.
5. After OFF, the public products payload has `merchant.showPublicPrice` false, `rentPrice` null, `hasRentPrice` true; the product card shows “Liên hệ” and not `₫` / `VND` / `/ ngày`.
6. Turning the switch ON again is HTTP 200 with `{ "showPublicPrice": true }`; the card shows money again.
7. `showPublicPrice` is restored to the value from before the case.

## Out of scope

App or API code. Production hotfix. Mobile. Changing default `showPublicPrice`. Full WEB-UI-SET-01..10 rerun in CI.

## API and data

No API change. The case reads existing `PUT /api/settings/merchant` and `GET /api/public/{tenantKey}/products`.

## Acceptance

- [x] WEB-UI-SET-11 ran headed locally: pass 10, fail 0
- [ ] iOS / Android: not applicable
- [ ] No new user-facing strings
- [ ] Flag restored; no order/customer leftover from this case
