# Plan #1200

Status: in-progress. Skill: `api-compat-review`, `api-route-standard`.

1. Intent, spec, plan, hàng LOG, 2 eval case.
2. Helper `client-capabilities` + `order-payments` (API), `client-capabilities` (web), CORS. Test.
3. Alias + lọc INSTALLMENT ở các route trả đơn; `paymentCountFilter` ở hai hàm danh sách trong `packages/database/src/order.ts`. Test.
4. `/api/payments` lọc `type`. Test.
5. Giữ BLOCK khi PUT sản phẩm cũ (`product.ts`, route `products/[id]`). Test.
6. Kiểm decode: `ios-decode-check/payments-decode.swift` (chạy `swiftc`, đưa JSON thật của GET đơn).
7. Verify trên dev-api với iOS `release-2026-10-12.2` sau khi merge, rồi mới promote.
