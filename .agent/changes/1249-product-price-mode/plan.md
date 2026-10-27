# Plan — #1249 (mockup v179, ba loại giá cùng tồn tại)

1. Docs (3 file này, spec #1189 mục 1 và 21) + dòng LOG "không đổi API" kèm đối chiếu app cũ.
2. Test đỏ trước: web `tests/web-product-price-form.test.ts`; `tests/block-pricing-api.test.ts` (FIXED+DAILY+BLOCK qua API); iOS `ProductsV2Tests`/`BlockPricingTests`; Android `BlockPricingTest`.
3. Web: `form-model.ts` (bỏ `dayKind`), `ProductFormPage.tsx` (ba hàng + hộp thoại setup), i18n 5 ngôn ngữ.
4. iOS (chuẩn): form dọc ba hàng, `BlockPriceViewController` riêng; sửa UI test 7d/7q/7r.
5. Android theo iOS.
6. Kiểm chứng, ảnh en+vi 4 ca của mockup, PR mới thay #1258/#1260, đóng #1267.
