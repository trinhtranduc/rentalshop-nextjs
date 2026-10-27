# Plan

1. Test đỏ: web `tabsForRole` / `groupedTabs` / `resolveTab` (link cũ); iOS `SettingsV2Logic.sections`; Android `SettingsRows.sections`.
2. Web: `settings-model.ts` (bỏ `bank-accounts`, `account`; nhóm 2), `SettingsPanel.tsx` (payment = bank + deposit; profile = profile + account), locales `settings.json` x5.
3. iOS: model nhóm dòng, màn Thu tiền, In & phiếu, Nâng cao, thẻ tên mở Hồ sơ & bảo mật, Tiền tệ trong Thông tin cửa hàng, strings en/vi, đổi UI test.
4. Android: như iOS (SettingsRows, SettingsV2Screen, màn con), strings en/vi, test.
5. Kiểm chứng: Jest (2 TZ), locales-valid-json, mobile-error-catalog, tsc/eslint, iOS unit + UI test, Android unit, ảnh thật.
6. LOG.md một hàng (không đổi API), PR vào dev `Fixes #1259`.
