# Plan — Android widget (PR-2)

Issue: #1381 · Skills: implement-issue, test-driven-development, mobile-parity, timezone-dates, api-compat-review (No API change), verify-change, review-pr, mobile-e2e-local.

1. Test trước (`domain/widget/*Test`, `res/Issue1381ResourcesTest`), commit riêng, thấy đỏ.
2. `domain/widget/`: snapshot, ngày VN, display, dựng từ `TodayWork`, refresher, link, hint, guide, layout.
3. `TodayWork`: đọc thêm `date`, `doneToday`, `*.count`, tên món đầu và số món (field đã có ở API).
4. `ui/widget/`: store, sync, worker, Glance widget + receiver, sheet, thẻ gợi ý. `app/build.gradle.kts` thêm `glance-appwidget`, `work-runtime-ktx`.
5. Manifest (receiver, host `todo`), `res/xml`, drawable, màu, chuỗi `values` + `values-vi`.
6. Móc: `MainActivity`, `AnyRentNavHost`, `OrdersHomeScreen`, `SettingsV2Screen`, `SessionStore.clearAuth`, `AnyRentApp`.
7. Verify: `:app:testDebugUnitTest`, `:app:assembleDebug`; AVD riêng có cửa sổ, API cục bộ, DB riêng Homebrew :5432; đặt widget, nhìn bằng mắt, ảnh ở `~/Documents/AnyRent-shots/widget-android/`.

Rollback: bỏ receiver khỏi manifest; widget đã đặt sẽ trống; không đụng API.
