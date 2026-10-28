# Plan — nhiều giỏ trên web

Issue: #1293 · Spec: ./spec.md

1. `cart-store.ts`: kiểu `DraftCart` + các bước thuần (thêm / chuyển / xoá / tên / avatar / tổng / lưu / khôi phục). Test Jest `tests/web-cart-store.test.ts`.
2. `useDraftCarts.ts`: hook giữ danh sách giỏ + localStorage theo tài khoản.
3. `CartTabs.tsx`: thanh tab + hộp xác nhận xoá.
4. `OrderEditor.tsx`: ~15 `useState` gom vào giỏ đang dùng; khung gốc thành cột dọc; độ lệch dính 48px; tham số URL; xoá giỏ sau khi tạo đơn.
5. Locales `editor.carts.*`.
6. Kiểm: Jest (TZ=UTC và Asia/Ho_Chi_Minh), `next lint --dir app/orders/create`, tsc so với origin/dev, build, e2e Chrome có cửa sổ.
