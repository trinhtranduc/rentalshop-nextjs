# Spec (#1667)

Block ngày: 1 ngày 80.000, 2 ngày 100.000, 3 ngày 120.000 (+20.000 mỗi ngày thêm). Thuê 3 ngày. Block là lựa chọn mặc định của sản phẩm.

1. `POST /api/orders`, client CÓ capability, dòng `pricingType: FIXED` không `pricingOptionId`: `200`, dòng lưu `FIXED` với đúng giá client gửi (ví dụ 550.000), không `pricingSnapshot`. Cả khi sản phẩm có lựa chọn `FIXED` riêng (gửi mã hay không).
2. Cùng dòng từ client KHÔNG có capability: tính lại theo bảng (120.000, `BLOCK`, có snapshot), như trước.
3. Dòng `BLOCK` (type `BLOCK`, hoặc `pricingOptionId` của lựa chọn block) của client có capability vẫn bị kiểm tra với bảng (`400 BLOCK_PRICE_MISMATCH` nếu lệch, trừ `priceOverridden`). Dòng `DAILY` không mã: không phải block (như trước).
4. `PUT /api/orders/[orderId]` (`repriceOrderEdit`), client CÓ capability đổi một dòng block đã lưu sang `FIXED` / `DAILY` / `HOURLY`: giá như client gửi, không giữ bảng block, không snapshot. Client KHÔNG có capability gửi `FIXED` cho dòng block đã lưu: vẫn giữ bảng và giá cũ.
5. Chưa nói gì về loại (`pricingType` rỗng) vẫn do lựa chọn mặc định quyết định, với cả hai loại client.

Test: `tests/api-compat/order-block-pricing.test.ts` (1, 2, 3), `tests/block-pricing-api.test.ts` (`findBlockOption`, `repriceOrderEdit`: 3, 4, 5); mọi golden test cũ giữ xanh.
