# Plan — Chủ shop sửa thông tin shop và chi nhánh trên điện thoại

Issue: #1313 · Status: in-progress · Spec: ./spec.md

## Xác minh API (làm trước khi code)

a) `PUT /api/settings/merchant` (`apps/api/app/api/settings/merchant/route.ts`): quyền `merchant.manage` (ADMIN, MERCHANT). Nhận và ghi
   `name` (bắt buộc), `phone`, `address`, `city`, `state`, `zipCode`, `country`, `taxId`, `description` (cùng `website`, `businessType`, `tenantKey`),
   chuyển thẳng vào `db.merchants.update`. Đủ trường, không cần đổi. Chỉ có `name` rỗng bị 400 `BUSINESS_NAME_REQUIRED`.
   `PUT /api/outlets?outletId=` (`apps/api/app/api/outlets/route.ts:234`): quyền `outlet.manage` (ADMIN, MERCHANT, OUTLET_ADMIN; OUTLET_STAFF và
   OUTLET_INVENTORY không có, `packages/auth/src/permissions.ts:143,228,...` nên 403). Schema `outletUpdateSchema`
   (`packages/utils/src/core/validation-schemas.ts:564`) nhận `name`, `address`, `phone`... MERCHANT: 403 nếu chi nhánh khác `merchantId`;
   OUTLET_ADMIN: 403 nếu không phải `userScope.outletId` (route.ts:268-292). Đã khớp spec, không đổi API.
b) `GET /api/outlets`: `limit` mặc định 50, tối đa 3000 (`outletsQuerySchema`, validation-schemas.ts:528), `isActive` mặc định true. App gọi
   `limit=200` cho chủ shop. Tên chi nhánh trùng bị 409 `OUTLET_NAME_EXISTS` (hiện lỗi theo mã).
c) Web (`apps/client/app/settings/sections.tsx` `ShopInfoSection`, `settings-model.ts` `addressLine`): `address` = "Số nhà, đường", `state` = "Quận / huyện",
   `city` = "Thành phố", cùng quốc gia, `zipCode`, `description`, `taxId`; địa chỉ ghép = address, state, city (bỏ trùng). Mobile dùng cùng ánh xạ.

## Steps

1. Test đơn vị thất bại trước (commit riêng): iOS `POS ADBDTests/ShopInfoTests.swift`, Android `ShopInfoLogicTest.kt` + file logic rỗng/khung.
2. Logic thuần: iOS `Model/ShopInfo.swift`, Android `ui/settings/ShopInfoLogic.kt` (cùng API): tên dòng theo vai, đích mở, quyền sửa shop /
   chi nhánh, ghép địa chỉ, dòng tóm tắt, kiểm hợp lệ, payload.
3. iOS: `ShopInfoViewController` (hai khối), `EditStoreViewController` nhận chế độ shop / chi nhánh / chỉ xem, `TabsV2APIService.updateMerchantInfo`,
   `OutletService.getOutlets(limit:)`, `SettingsV2ViewController` mở đúng màn và đặt tên dòng. Chuỗi en + vi.
4. Android: `StoreInfoScreen` theo iOS (hub chủ shop, form shop, form chi nhánh, chỉ xem), `ApiParity.updateMerchantInfo`, chuỗi values + values-vi.
5. Build + test cả hai, kiểm trực quan, `.agent/api-changes/LOG.md`, PR.

## Verify

iOS: `xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' -derivedDataPath ~/AnyRent-builds/dd-1313 build` + test `ShopInfoTests`.
Android: `./gradlew :app:assembleDebug :app:testDebugUnitTest --tests '*ShopInfoLogicTest'`.

## Risks

- Cùng sửa `SettingsV2.swift`, `SettingsV2ViewController.swift`, `SettingsParity.kt` với #1310/#1311/#1312: chỉ đụng dòng `.storeInfo` và tên dòng.
- App cũ giữ màn cũ; API không đổi.

## Rollback

Revert PR.
