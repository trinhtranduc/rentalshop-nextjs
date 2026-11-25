# Plan #1648

Status: in-progress. Skills: `api-compat-review`, `i18n-keys`, `mobile-parity`.

1. `packages/constants/src/shop-language.ts`: `emailLanguageFor` (+ test `tests/shop-email-language.test.ts`).
2. API: 6 route gửi email + profile + settings merchant dùng nó; truy vấn lấy thêm `country` (`findByEmail` trong `packages/database/src/user.ts`, cron, extend, renew).
3. Web: bỏ dòng ở `apps/client/app/settings/{sections.tsx,SettingsPanel.tsx,settings-model.ts}`; xóa khóa locale chết (`settings.json` ×12).
4. iOS (`ShopInfoViewController`, `ShopInfo.swift`, `TabsV2APIService`, Localizable) và Android (`ShopInfoScreens`, `EmailLanguageSetting`, `ApiParity`, strings): bỏ dòng, giữ phần đọc `merchant.language` không cần.
5. Tests, LOG #1648, verify: jest TZ=UTC và Asia/Ho_Chi_Minh, tsc so mốc, e2e thật (web Chrome mở; iOS simulator; Android emulator).
