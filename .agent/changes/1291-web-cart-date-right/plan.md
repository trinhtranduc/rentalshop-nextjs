# Plan — ngày thuê ở cột phải

Issue: #1291 · Spec: ./spec.md

1. `apps/client/app/orders/create/OrderEditor.tsx`: thêm `min-[1100px]:hidden` cho nút đầu trang; thêm nút `hidden min-[1100px]:flex` trong aside trước ô Khách hàng.
2. Test nguồn `tests/web-create-order-days-aside.test.ts`.
3. Kiểm: type-check apps/client, lint, Jest (TZ=UTC và TZ=Asia/Ho_Chi_Minh), ảnh >=1100px và <1100px.
