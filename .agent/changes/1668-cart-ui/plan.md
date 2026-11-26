# Plan (#1668)

1. `apps/client/app/orders/create/CartTabs.tsx`: prop `trailing`.
2. `apps/client/app/orders/create/OrderEditor.tsx`: `typeSwitch(compact)`, truyền vào `CartTabs`, bỏ tab khỏi cột giỏ khi tạo đơn, vùng thanh toán thành thẻ có nhãn, "Tổng đơn" to, nút `flex-none shrink-0`.
3. `apps/client/app/orders/create/parts.tsx`: `CartLineRow` thành thẻ.
4. `locales/*/orders.json`: `web.editor.cart.payment` ở 12 ngôn ngữ.
5. `tests/web-cart-layout.test.ts`.
6. Verify: `cd tests && TZ=UTC yarn test web-cart web-create-order hardcoded-vietnamese locales-valid-json`, lặp lại với `TZ=Asia/Ho_Chi_Minh`; `tsc` client không lỗi mới ở `orders/create`; Chrome có cửa sổ trên web local.

Không đụng `apps/api`, `packages/*`, `prisma/`, iOS, Android: không cần dòng LOG.
