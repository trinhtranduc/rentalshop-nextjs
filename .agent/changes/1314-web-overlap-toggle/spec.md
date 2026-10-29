# Spec — Web: shop owner toggles overlapping orders

Issue: #1314 · Status: in-progress · Intent: ./intent.md

## Behavior

1. Owner (MERCHANT) sees the card "Cho tạo đơn khi trùng lịch" in Cài đặt → Thông tin cửa hàng, between "Nhận đặt online" and
   "Giá theo khối ngày với app cũ", with hint "Tắt thì không tạo được đơn khi đồ đã được thuê hết trong những ngày đó."
2. Switch shows the stored value (`merchant.allowOverlappingOrders`); a missing value reads ON (as `allowsOverlap`).
3. Tapping saves at once with `PUT /api/settings/merchant {allowOverlappingOrders}`; success toast and profile refresh; on error the switch goes back and an error toast shows.
4. Other roles (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY) do not see the card.
5. After a change, /orders/create reads the new value (OrderEditor re-reads `GET /api/users/profile` on mount).

## Out of scope

API, schema, mobile apps (the phone switch already exists), the order editor.

## API and data

No change. `PUT /api/settings/merchant` with only `allowOverlappingOrders` is a "setting only" body (no name needed) and writes only that field
(`apps/api/app/api/settings/merchant/route.ts` `settingOnly`); MERCHANT / ADMIN only, 403 otherwise.

## Acceptance

- [ ] Jest `tests/web-settings-overlap.test.ts` (model: flag, role)
- [ ] Strings in en, vi, ja, ko, zh; `locales-valid-json` green
- [ ] Visible check: toggle, reload keeps it, /orders/create follows, outlet roles do not see the card
