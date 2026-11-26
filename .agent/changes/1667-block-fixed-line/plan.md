# Plan (#1667)

1. Test đỏ trước (commit riêng): thêm sản phẩm fixture 14 (block mặc định + lựa chọn `FIXED`), ca POST và `findBlockOption` / `repriceOrderEdit`.
2. `findBlockOption(product, line, opts?: { clientKnowsBlock })`: khi `clientKnowsBlock` và type `FIXED` không mã thì `null` (DAILY / HOURLY đã là `null`).
3. `apps/api/app/api/orders/route.ts`: truyền `{ clientKnowsBlock }`. `repriceOrderEdit`: client có capability đổi sang FIXED / DAILY / HOURLY thì không giữ bảng của snapshot và truyền cờ cho `findBlockOption`.
4. Verify: `cd tests && TZ=UTC yarn test api-compat order-block block-pricing no-raw-server-errors` và `TZ=Asia/Ho_Chi_Minh`.
5. LOG #1667; PR vào `dev` với `Fixes #1667`.

Rollback: revert PR; không có dữ liệu hay schema đổi.
