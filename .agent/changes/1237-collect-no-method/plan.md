# Plan #1237
1. iOS: bỏ methodStack/renderMethods, gửi "CASH".
2. Android: bỏ danh sách radio, gửi "CASH".
3. Web: CollectDialog + UnpaidStages bỏ select; page.tsx bỏ handoverMethod.
4. Chạy type-check/lint web, test iOS, Android unit test, jest locales.
5. iOS `pickCollectFirst`, Android `CartStagedSection`, web `StagePlanPanel`: bỏ chọn phương thức, giữ Thu ngay / Không thu.
