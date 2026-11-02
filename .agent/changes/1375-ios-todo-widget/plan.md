# Plan — PR-1 iOS widget

Issue: #1375 · Status: in-progress · Skills: implement-issue, bug-fix-tdd (test trước), mobile-parity, timezone-dates, api-compat-review (No API change), i18n-keys (chuỗi iOS), verify-change, review-pr, mobile-e2e-local.

1. Test trước (`TodayWidgetDisplayTests`, `TodayWidgetDataTests` trong `POS ADBDTests`), chạy thấy đỏ, commit riêng.
2. Lib `DraftOrderActivity/TodayWidget*.swift`; app `TodayWidgetData`, `TodayWidgetSync`, `WidgetGuideViewController`; extension `TodayWorkWidget.swift`.
3. `scripts/patch_today_widget_pbxproj.py` (thêm file, `APP_GROUP_ID`, entitlements của extension); entitlements app; khoá `AnyRentAppGroup` trong hai `Info.plist`. Không đổi ký/Team.
4. `AppDelegate` tách URL theo host; hook ghi dữ liệu (mở app, đổi chi nhánh, đơn đổi, sau đăng nhập); xoá ở `User.reset()`.
5. Thẻ gợi ý trong `OrdersViewController`; dòng Widget + công tắc trong `SettingsV2`.
6. Chuỗi `en.lproj` và `vi-VN.lproj` (nối bằng `cat >>`, kiểm `wc -l`).
7. Verify: test xanh, build `Development` và `Production`, chạy Simulator với API cục bộ, chụp ảnh vào `~/Documents/AnyRent-shots/widget-ios/`.

Rollback: bỏ `TodayWorkWidget` khỏi `AnyRentLiveActivityBundle`; widget đã thêm sẽ trống; không đụng API.
