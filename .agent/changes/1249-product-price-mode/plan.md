# Plan — #1249 (mockup v170)

1. Docs (file này) + dòng LOG "không đổi API" cập nhật.
2. Test đỏ trước: web `tests/web-product-price-form.test.ts`; iOS `BlockPricingTests`/`ProductsV2Tests`; Android `BlockPricingTest`: radio -> payload, đổi qua lại giữ dữ liệu, mở sản phẩm cũ chọn đúng radio, chưa có bảng thì mở setup / huỷ trở lại, mặc định Theo lần.
3. Web: `block-draft.ts`, `form-model.ts`, `ProductFormPage.tsx` (+ hộp thoại setup dùng `BlockTableEditor`), i18n 5 ngôn ngữ.
4. iOS (chuẩn): form dọc theo mockup, màn `BlockPriceViewController` riêng (dùng `BlockTableEditorView`), Sao chép; sửa UI test 7d/7q/7r.
5. Android theo iOS.
6. Kiểm chứng, ảnh en+vi, PR thay UI của #1258.
