# Spec — Gợi ý "Chi nhánh khác còn N" trong giỏ điện thoại

Issue: #1353 · Status: done · Intent: ./intent.md · Plan: ./plan.md · Gốc: `../1335-multi-outlet-products/spec.md` quy tắc 18-20; API: `../1347-other-branches-hint/spec.md`

## Khi nào gọi

Cả ba điều kiện:
1. Vai trò MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY (OUTLET_STAFF và vai trò khác: không bao giờ gọi).
2. Chủ shop: shop có từ 2 chi nhánh đang hoạt động. Vai trò chi nhánh: dùng `BranchListing.sendsListed` (không biết số chi nhánh thì vẫn gọi, biết là 1 thì không).
3. Giỏ có ít nhất một dòng thiếu hàng (đã biết "còn" nhỏ hơn số cần) hoặc trùng lịch ở chi nhánh của đơn.

Gọi sau khi giỏ nhận kết quả `batch-availability` (cùng nhịp debounce). MỘT lần gọi cho mọi sản phẩm thiếu (không trùng, tăng dần). Kết quả cũ bị bỏ khi ngày, loại đơn, chi nhánh hoặc danh sách sản phẩm thiếu đổi.

## Body

`products: [{productId, quantity: 1}]`, `orderType` RENT | SALE, `outletId` (chi nhánh đang dùng, bỏ khi chưa biết).
- RENT, lấy và trả cùng một ngày Việt Nam: `date: "YYYY-MM-DD"`.
- RENT nhiều ngày: `startDate` = đầu ngày Việt Nam của ngày lấy, `endDate` = giây cuối ngày Việt Nam của ngày trả (ISO UTC, như `batch-availability`).
- RENT chưa có ngày, hoặc không có sản phẩm thiếu: không gọi. SALE: không gửi ngày.

## Hiển thị

Dưới chip của dòng thiếu hàng: "Chi nhánh khác còn: Quận 7 (3), Thủ Đức (1)" (chữ phụ, màu nhấn). Nhiều hơn 3 chi nhánh: 3 đầu rồi "+N". Rỗng, lỗi mạng, 403, 404, kết quả hết hạn: không hiện gì, không báo lỗi. Không đổi nút "Tạo đơn".

## Chuỗi mới

`products.cart.othersHave` / `cart_others_have` = "Chi nhánh khác còn: %@" / "Other branches have: %s" (en + vi, iOS và Android).

## Tương thích API

Không đổi API. Chỉ app mới gọi route đã có ở `dev` (#1347). Route chưa ở `main-real`: nhận 404, app không hiện gì.
