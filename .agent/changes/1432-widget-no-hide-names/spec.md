# Spec — Bỏ công tắc "Ẩn tên khách trên widget"

Issue: #1432 · Status: in-progress · Intent: ./intent.md

## Behavior

1. Cài đặt (iOS, Android) không có công tắc "Ẩn tên khách trên widget". Không có section nào bị bỏ thêm: công tắc nằm chung nhóm với dòng "Widget".
2. Dòng "Widget" vẫn mở sheet hướng dẫn.
3. File ghi ra luôn có tên khách của đơn, không có khoá `hideNames`; file iOS không có `labels.hiddenName`.
4. Hàm dựng file và hàm dựng dòng không còn tham số `hideNames`; màn hiển thị không còn `hidesNames`.
5. Dòng không có tên thì ô tên trống, không vẽ "chạm để mở".
6. File cũ có `hideNames: true/false` (iOS thêm `labels.hiddenName`) vẫn đọc được. File cũ `hideNames: true` có tên rỗng: ô tên trống cho tới lần ghi kế tiếp.
7. File vẫn không có token, tiền, SĐT, ảnh.

## Out of scope

Migration giá trị đã lưu. `.privacySensitive()`. Tăng `v`. Chữ thay thế cho đơn không có tên.

## API and data

Không đổi API. File widget chỉ ở phía app: bỏ `hideNames`, iOS bỏ thêm `labels.hiddenName`. `v` giữ nguyên (iOS 2, Android 1).

## Acceptance

- [ ] 1, 2: ảnh Cài đặt trên Simulator và AVD; `test7lWidgetSettingsRow`
- [ ] 3, 4: `TodayWidgetDataTests`, `TodayWidgetDataTest`, biên dịch
- [ ] 5: `TodayWidgetDisplayTests`, `TodayWidgetDisplayTest`
- [ ] 6: test file cũ trên cả hai nền tảng
- [ ] 7: các test "no money, phone, token" giữ nguyên
