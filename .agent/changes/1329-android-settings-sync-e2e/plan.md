# Plan (#1329)

1. Worktree riêng từ `origin/dev`, DB `anyrent_e2e_android`, API :3270, AVD `e2e_android_1309` :5590 có cửa sổ.
2. Sửa công cụ: `adb-ui.sh` (watchdog kill -9, xoá file dump cũ), `android-lib.sh` (`texts` bằng python, `login_as` không bấm Back khi app chưa lên).
3. Viết các ca trong `android-flow-settings-sync.sh`, máy in giả `escpos-capture.py`, lệnh `bank` trong `settings-sync-api.js`.
4. Chạy từng ca từng vai trò, đọc ảnh, ghi kết quả vào `SETTINGS_SYNC.md`.
5. Chạy unit test Android liên quan (`BankQrReceiptTest`, `OutletPrintSettingsTest`, `BankAccountCacheTest`, `ShopInfoLogicTest`, `CurrencySettingTest`, `SettingsRowsTest`, `OverlapSettingTest`, `OrderShareModelTest`).
