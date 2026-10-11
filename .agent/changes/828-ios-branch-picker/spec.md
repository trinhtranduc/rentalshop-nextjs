# Spec

- Home: the line above "Chọn sản phẩm" (was "shop · branch") shows "🏬 <branch> ▾" (#1D4ED8, soft-blue pill when not the
  default). Tappable only for MERCHANT with ≥ 2 active outlets; outlet users and one-branch shops see the name in grey.
- Sheet "Chọn chi nhánh": hint, radio rows (name, address, "mặc định"), "Đang chọn" badge, "Dùng <branch>". Active only.
- Cart with lines → alert "Đổi sang <branch>?" / "Giỏ hàng đang có N món của <current>…" [Huỷ] [Xoá giỏ và đổi].
  Empty cart → switch at once.
- Default = shop default outlet. Choice remembered per account on the device; logout (User.reset) forgets it. A
  remembered outlet that is no longer active falls back to the default and an alert says so once.
- One source: `CurrentOutlet.shared` (`id`, `merchantFilterId`, `outlet`). Uses: product list `outletId`, availability
  (detail, calendar, cart batch, order check), product form stock outlet, `POST /api/orders` `outletId` (merchant),
  `GET /api/orders` `outletId` (merchant), calendar count/by-date `outletId`, outlet-operations `outletIds`,
  analytics/period `outletIds` (read by the API after #827), receipts/share image outlet name, phone, address.
- Strings vi + en.
