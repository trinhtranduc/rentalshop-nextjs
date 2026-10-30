# Plan — "Hiện ở chi nhánh" trên điện thoại

Issue: #1346 · Status: in-review · Spec: ./spec.md
Skill: `implement-issue`, `mobile-parity`, `api-compat-review` (không đổi API), `i18n-keys` (chuỗi mobile), `bug-fix-tdd` (test trước), `verify-change`, `review-pr`, `mobile-e2e-local`.

## Thứ tự (một PR, nhiều commit)

1. Docs (3 file này).
2. Test đỏ iOS (`ProductsV2Tests`, `DepositPlanTests`) và Android JVM (`BranchListingTest`) — commit `test(mobile): reproduce ...`.
3. iOS: `BranchListing` + `ProductOutletStock.isListed` + `OutletStockItem.isListed` + token; `ProductService.setBranchListing`; danh sách `listed=true`; nhãn + chặn thêm giỏ cho chủ shop; ô tick trong form; ô mờ ở chi tiết (nhân viên); chuỗi en + vi.
4. Android: giống iOS (`ApiClient`/`ApiParity`, models, danh sách, form, giỏ, strings en + vi).
5. Build + test cả hai; kiểm trực quan trên DB cục bộ riêng; ảnh vào `~/AnyRent-builds/e2e-branchtick-shots/`.
6. PR vào `dev`, body tiếng Việt, `Fixes #1346`, `Refs #1335`.

## Files (iOS)

`Model/ProductsV2.swift` (logic), `Model/Product.swift`, `Model/ProductRequest.swift`, `Model/DepositPlan.swift` (token), `Library/Services/ProductService.swift`, `Library/Services/APIEndpoint.swift`, `ViewModels/ProductsHomeViewModel.swift`, `Viewcontrollers/Products/v2/{ProductsHomeViewController,ProductFormViewController,ProductDetailViewController}.swift`, `en.lproj` + `vi-VN.lproj` `Localizable.strings`, test `POS ADBDTests/{ProductsV2Tests,DepositPlanTests}.swift`.

## Files (Android)

`domain/products/BranchListing.kt` (logic, mới), `domain/products/ProductRules.kt` (`addState`, `NotListed`), `domain/deposit/DepositPlan.kt` (token), `data/model/Models.kt` (`isListed`), `data/ApiClient.kt` (đọc dòng tồn), `data/ProductsV2Api.kt` (`listed=true`, `setBranchListing`, `createStock`), `ui/home/v2/{ProductsHomeScreen,ProductsHomeViewModel,ProductFormV2Screen,ProductDetailScreen,BlockPriceScreen}.kt`, `res/values{,-vi}/strings.xml`, test `domain/products/BranchListingTest.kt`, `ui/home/v2/ProductsHomeViewModelTest.kt`. Khác iOS: màn chi tiết lưu xong thì danh sách thay dòng tại chỗ (`SavedProducts`), iOS đã có `detail.onSaved`.

## Kiểm trực quan

DB riêng `anyrent_branchtick_e2e` (seed `scripts/mobile-e2e/seed-local.sh`), API cục bộ :3540. iOS: `test1dBranchListingOwner`, `test1eBranchListingBranchRole` trong `AnyRentE2ETests` (chủ shop, quản lý, nhân viên, shop một chi nhánh). Android: emulator riêng, `adb-ui.sh`. Ảnh: `~/AnyRent-builds/e2e-branchtick-shots/`.

## Rủi ro

- Nhân viên đa chi nhánh nhận cả `outletStock` mọi chi nhánh cho tới PR 3 (API): ô mờ của họ lấy dòng chi nhánh mình theo `CurrentOutlet`.
- Chủ shop không gửi `listed`: danh sách dài hơn nhãn "Chưa hiện"; thêm giỏ bị chặn cho món chưa tick.

## Rollback

Revert PR. API không đổi; app cũ không bị ảnh hưởng.
