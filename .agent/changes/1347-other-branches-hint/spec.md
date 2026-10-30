# Spec — Gợi ý "Chi nhánh khác còn N"

Issue: #1347 · Status: in-progress · Intent: ./intent.md · Plan: ./plan.md · Gốc: `../1335-multi-outlet-products/spec.md` quy tắc 18-20, 28

## API

`POST /api/products/other-outlets-availability` (quyền `products.view`, `requireActiveSubscription: false` như `batch-availability`).

Body (zod): `products: [{ productId, quantity? }]` (1..100; `quantity` nhận cho giống `batch-availability`, không dùng để lọc), `orderType?` (`RENT` mặc định | `SALE`), `date` (YYYY-MM-DD) hoặc `startDate` + `endDate` (RENT bắt buộc một trong hai; SALE bỏ qua), `outletId?` (chi nhánh của đơn).

Chi nhánh của đơn: vai trò chi nhánh dùng chi nhánh mình (gửi chi nhánh khác: 403 `NO_OUTLET_ACCESS`); MERCHANT không gửi `outletId` dùng chi nhánh mặc định; ADMIN bắt buộc gửi. Chi nhánh không thuộc shop hoặc đã tắt: 404 `OUTLET_NOT_FOUND`. Sản phẩm không thuộc shop hoặc đã xoá: 404 `PRODUCTS_NOT_FOUND`.

Vai trò: MERCHANT, ADMIN, OUTLET_ADMIN, OUTLET_INVENTORY; còn lại (OUTLET_STAFF) 403 `INSUFFICIENT_PERMISSIONS` (hàm thuần `canSeeOtherOutlets`).

Kết quả: `data.results: [{ productId, outlets: [{ outletId, outletName, available }] }]`, theo thứ tự `products`. `outlets` chỉ gồm chi nhánh KHÁC của shop, `isActive`, món có dòng `OutletStock.isListed = true`, `available > 0`; xếp `available` giảm dần rồi `outletId` tăng dần; không có thì `[]`. `available = max(0, stock − số lượng các đơn giữ hàng trong ngày)`, đúng `calculateEffectivelyAvailable` + cách gom của `batch-availability` (RENT: đơn RESERVED / PICKUPED có ngày lấy ≤ ngày cuối và ngày trả ≥ ngày đầu theo ngày Việt Nam, đơn chưa có ngày trả giữ nếu lấy trong khoảng; SALE: đơn bán RESERVED hoặc PICKUPED lấy từ bây giờ trở đi). Shop một chi nhánh: `outlets: []` cho mọi món, route không chặn.

## Web

`apps/client/app/orders/create`: hook gọi route khi có dòng thiếu hàng ("short" hoặc trùng lịch) ở chi nhánh của đơn, chỉ khi người dùng là MERCHANT / OUTLET_ADMIN / OUTLET_INVENTORY và shop có nhiều hơn 1 chi nhánh. Hiện dưới dòng "Hết hàng" của dòng giỏ: "Chi nhánh khác còn: Quận 7 (3), Thủ Đức (1)". Không có chi nhánh nào còn: không hiện gì thêm. Lỗi mạng hoặc 403: không hiện gì.

## Chuỗi mới (orders.web.editor.cart)

`othersHave` = "Chi nhánh khác còn: {list}" (5 ngôn ngữ).
