# Plan

1. Test đỏ: iOS `ProductsV2Tests`, Android `CreateOrderSheetTest` cho giỏ nhiều món.
2. Logic: `moreCount` trong `CreateOrderSheetLogic.confirm` / `CreateOrderSheet.confirm`.
3. UI: dòng "+N" trong `CreateOrderConfirmSheet` iOS và Android.
4. Chuỗi en/vi (append bằng cat >>, kiểm wc -l).
5. Chụp trước/sau: SE, Android 360dp; kiểm web 360px.
6. Test: iOS unit, Android testDebugUnitTest, jest locales-valid-json mobile-error-catalog.
