# Plan — #1249

1. Test đỏ (Jest web: form-model/block-model; iOS: ProductPricing; Android: ProductPricing) cho: kind mở sản phẩm, seed từ giá ngày cũ, bảng không sửa -> DAILY, Theo lần bỏ bảng.
2. Web: `block-model.ts` (seed, `tableToSave`), `form-model.ts` (priceKind, block, validate, payload), tách `BlockTableEditor.tsx`, form + thẻ chi tiết, i18n 5 ngôn ngữ.
3. iOS: `ProductPricing` (kind, seed, tableToSave), `BlockTableEditorView` thay `BlockPriceViewController`, form bỏ công tắc, strings en + vi-VN.
4. Android: tương tự (`ProductRules.kt`, `BlockPriceScreen.kt` -> editor), strings values + values-vi.
5. Kiểm chứng: Jest TZ=UTC và TZ=Asia/Ho_Chi_Minh, tsc, iOS test, `:app:testDebugUnitTest`, locales-valid-json, mobile-error-catalog, plutil -lint.
6. Ảnh trước/sau en+vi; LOG.md; PR vào dev.
