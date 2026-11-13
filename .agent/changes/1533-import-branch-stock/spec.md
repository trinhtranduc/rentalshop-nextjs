# Spec — Nhập Excel chọn chi nhánh và số lượng theo từng chi nhánh

Issue: #1533 · Status: in-review (PR #1534) · Intent: ./intent.md · Mockup: https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 (tab đầu)

## Behavior

API `POST /api/products/bulk-import`
1. Body không có `outletId` và không dòng nào có `outlets`: như hôm nay (chi nhánh của role chi nhánh, hoặc `outlets.data[0]`; món trùng mã vạch bỏ qua; các chi nhánh khác dòng 0 không hiện).
2. Body có `outletId` (chủ shop): mỗi dòng không có `outlets` dùng `[{ outletId, stock: dòng.stock }]`.
3. Dòng có `outlets: [{ outletId, stock }]`: đó là các chi nhánh bật; chi nhánh không có trong mảng là tắt.
4. Chủ shop gửi `outletId` hoặc `outlets[].outletId` không thuộc các chi nhánh đang hoạt động của shop: 404 `OUTLET_NOT_FOUND`, không ghi gì.
5. Role chi nhánh (OUTLET_ADMIN, OUTLET_INVENTORY): chỉ chi nhánh mình; số lấy từ `outlets` của chi nhánh mình nếu có, không thì `stock`; mọi chi nhánh khác bỏ qua.
6. Món mới: dòng tồn mọi chi nhánh đang hoạt động; chi nhánh bật `{ stock: s, available: s, renting: 0, isListed: true }`; chi nhánh tắt `{ 0, 0, 0, isListed: false }`; `totalStock` = tổng s.
7. Món mới không bật chi nhánh nào (`outlets: []`): lỗi dòng, cả file không nhập (như mọi lỗi dòng hôm nay).
8. Món đã có (cùng mã vạch, cùng shop, chưa xoá), theo từng chi nhánh bật: dòng tồn chưa có hoặc `stock` = 0 thì ghi `stock = available = s`, `isListed: true`; `stock` > 0 thì bỏ qua chi nhánh đó. Chi nhánh tắt không đổi. Sau khi ghi, `totalStock` = tổng `stock` mọi dòng của món.
9. Món đã có mà không chi nhánh nào được ghi: tính vào `skipped` như hôm nay. Món đã xoá (cùng mã vạch): bỏ qua như hôm nay.
10. Response giữ `imported` (món mới), `skipped`, `failed`, `total`, `errors`; thêm `updated` (món đã có được ghi ở ít nhất một chi nhánh) và `byOutlet: [{ outletId, listed, outOfStock, skipped }]` khi gọi có chi nhánh (mục 2-3).

Web `/products/import`
11. Chủ shop, shop ≥ 2 chi nhánh hoạt động: ô “Số lượng trong file là của” (mặc định chi nhánh chính, rồi theo thứ tự API); mỗi chi nhánh một cột ô Hiện + số lượng; chi nhánh đã chọn bật với số của file, chi nhánh khác tắt.
12. Bật ô Hiện của chi nhánh khác: số bắt đầu 0. Tắt: ô số mờ, không gửi. “Bật hết” bật cả cột (số giữ nguyên). “Chép số lượng từ <chi nhánh đã chọn>” bật cả cột và chép số của cột đã chọn.
13. Đổi chi nhánh trong ô chọn: các ô trở về mặc định theo chi nhánh mới.
14. Dòng không bật chi nhánh nào: báo “Bật ít nhất một chi nhánh”, không nhập dòng đó.
15. Quản lý / nhân viên kho: một cột chi nhánh mình, ô chọn khoá. Shop 1 chi nhánh hoạt động: bảng như hôm nay (một cột Số lượng); vẫn gửi `outletId` của chi nhánh đó.
16. Kết quả: khi có `byOutlet`, hiện mỗi chi nhánh: số món hiện (kèm số đang hết hàng) và số bỏ qua vì đã có hàng; thêm dòng số món đã có được thêm tồn.

## Out of scope

Giới hạn số sản phẩm của gói khi nhập; điện thoại; đổi file mẫu; chuyển hàng giữa chi nhánh; ẩn món bằng import.

## API and data

- Request (tuỳ chọn): `outletId: number`; mỗi `products[i].outlets?: Array<{ outletId: number; stock: number }>` (stock nguyên ≥ 0).
- Response (thêm): `updated: number`, `byOutlet?: Array<{ outletId: number; listed: number; outOfStock: number; skipped: number }>`.
- `outletId` là id số của chi nhánh (như mọi route). Không migration.

## Acceptance

- Jest `tests/api/bulk-import-branches.test.ts` (mục 1-10, cả role) và `tests/web-product-import-branches.test.ts` (mục 11-16 phần model) pass; `tests/api/product-branch-rules.test.ts` giữ pass.
- Chạy thật trên web (Chrome có cửa sổ) với shop 2 chi nhánh: món mới, món đã có, chi nhánh đã có hàng, quản lý chi nhánh.
