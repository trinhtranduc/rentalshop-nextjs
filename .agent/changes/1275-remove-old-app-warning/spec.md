# Spec

- Web `DepositSection.tsx`: bỏ khung cảnh báo và Modal xác nhận; bấm Lưu là lưu. Bỏ khoá `oldAppWarning`, `confirmTitle`, `confirmOk` (đã kiểm chỉ dùng ở đây) trong 5 ngôn ngữ.
- iOS `DepositSettingsViewController.swift`: bỏ khung vàng và alert xác nhận; chọn chế độ giai đoạn là lưu. Bỏ `deposit.warning.oldApps`, `deposit.enable.title`, `deposit.enable.confirm`.
- Android `DepositSettingsScreen.kt`: tương tự; bỏ `deposit_warning_old_apps`, `deposit_enable_title`, `deposit_enable_confirm`.
- Test iOS (unit + UI) không còn kiểm câu này.
- Không đổi API.
