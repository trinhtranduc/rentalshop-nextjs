# Spec (same as iOS `.agent/changes/828-ios-branch-picker/spec.md`)

- Home (new Home, flag `newProducts`): the line above "Chọn sản phẩm" (was "shop · branch") shows "🏬 <branch> ▾"
  (#1D4ED8, soft-blue pill when not the default). Tappable only for MERCHANT with ≥ 2 active outlets; outlet users and
  one-branch shops see the name in grey, not tappable.
- Sheet "Chọn chi nhánh": hint, radio rows (name, address, "mặc định"), "Đang chọn" badge, "Dùng <branch>". Active only.
- Cart with lines → dialog "Đổi sang <branch>?" / "Giỏ hàng đang có N món của <current>. Đổi chi nhánh sẽ xoá giỏ hàng."
  [Huỷ] [Xoá giỏ và đổi]. Empty cart → switch at once.
- Default = the shop's default outlet. Choice remembered per account on the device; logout (`SessionStore.clearAuth`)
  forgets it. A remembered outlet that is no longer active falls back to the default and a dialog says so once.
- One source: `CurrentOutlet` (`id`, `merchantFilterId`, `outlet`, `storePhone`, `storeAddress`), rules in
  `domain/outlet/CurrentOutletState` + `CurrentOutletLogic` (unit tested). Uses: product list `outletId`, product
  detail / calendar stock and availability, availability repository (cart batch, order check), product form stock
  outlet, `POST /api/orders` `outletId` (merchant), `GET /api/orders` `outletId` (merchant), calendar count/by-date
  `outletId`, outlet-operations `outletIds`, analytics/period `outletIds`, receipts/share image outlet name, phone,
  address.
- A branch change reloads Home at once and bumps `OrdersChanged`, so Orders, Calendar and Overview reload when shown.
- Strings vi + en (`values/strings.xml`, `values-vi/strings.xml`).
