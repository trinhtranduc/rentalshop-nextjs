# Plan — Bỏ công tắc "Ẩn tên khách trên widget"

Issue: #1432 · Status: in-progress · Spec: ./spec.md

## Steps

1. Thêm test file cũ (JSON nguyên văn), chạy trên code hiện tại để chứng minh JSON đúng dạng cũ.
2. iOS: bỏ `hideNames`, `hiddenName`, `hidesNames`, khoá `widget.hideCustomerNames`, `hideNamesChanged`, `lastWork`, `lastUserId` (chỉ phục vụ công tắc), hàng trong Cài đặt, ba chuỗi, nhánh "chạm để mở".
3. Android: như iOS, thêm `withoutNames`, `HideWidgetNamesRow`, `TodayWidgetFile.read` (chỉ `hideNamesChanged` gọi qua interface).
4. Test: bỏ test của công tắc, thêm test "tên luôn có", sửa danh sách khoá; `test7lWidgetSettingsRow` bỏ phần công tắc.
5. Ghi một dòng vào `.agent/changes/1372-widget-calendar/spec.md`.
6. Chạy test, build, xem Cài đặt trên Simulator và AVD riêng.

Skill: `mobile-parity`, `i18n-keys` (chỉ bỏ chuỗi của app, không đụng `locales/`).

## Verify

- iOS: `POS ADBDTests` trên simulator mới, build scheme gồm widget extension.
- Android: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:testDebugUnitTest :app:assembleDebug`

## Risks

File cũ không đọc được thì widget về "đăng nhập" (iOS) hoặc "Cũ" (Android) cho tới lần ghi kế tiếp: test ở bước 1 giữ chỗ này. Chỉ ảnh hưởng bản dev.

## Rollback

Revert PR. File mới không có `hideNames` thì code cũ không đọc được, widget chờ lần ghi kế tiếp.
