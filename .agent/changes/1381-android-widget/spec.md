# Spec — Android widget (PR-2)

Issue: #1381 · Status: in-progress. Hành vi 1 đến 15 và dữ liệu ở `.agent/changes/1372-widget-calendar/spec.md`. Ở đây chỉ ghi phần chọn lúc code.

1. **Một widget kéo giãn** (W4). Mặc định 4×2, thu nhỏ được còn 2×2. Nhỏ (rộng dưới 180dp): vòng tiến độ + 3 ô số. Vừa: đầu widget (Hôm nay · dd/MM, nút ↻), dải 3 ô số, tới 3 việc mỗi việc 2 dòng tuỳ chiều cao (mục 9.2 P2: Android 3 dòng), chân "xong N/M · +K việc khác · cập nhật hh:mm".
2. **Màu** như iOS: Trễ `B91C1C`, Giao `1D4ED8`, Trả `C2410C`; tối `DC2626`, `2563EB`, `EA580C`. "Chưa soạn đồ" chữ cam `9A3412` / `FDBA74` + biểu tượng, không nền. Ô số bằng 0 mờ 40% như iOS.
3. **Dữ liệu:** `TodayWidgetSnapshot` JSON trong SharedPreferences riêng `anyrent.todayWidget`. Không token, tiền, SĐT, ảnh. Không có `labels`: widget Android đọc được chuỗi của app. Đăng xuất xoá file; không có file + chưa đăng nhập = "Mở AnyRent để đăng nhập".
4. **Làm mới:** app đang mở: coroutine trong app (mở app, sau đăng nhập, đổi chi nhánh, đơn đổi; gộp 0,8 giây như iOS). Nền: WorkManager định kỳ 45 phút (flex 15, khoảng cách 30 đến 60 phút), nút ↻, và một lần ở nửa đêm VN để đổi sang ngày mới hoặc "Cũ". Chỉ gọi mạng khi máy có widget và đang đăng nhập.
5. **Xác thực:** Worker cùng tiến trình (manifest không có `android:process`), dùng `ApiClient.get()` (một instance, một `refreshLock`) và `SessionStore`, như mọi màn khác. `inputData` của Worker rỗng, Glance không có state riêng. Lỗi mạng không đăng xuất (`refreshAccessToken` ném `AppError.Network`). Câu trả lời về sau khi đã đăng xuất bị bỏ.
6. **Deep link:** `anyrent://order/<id>`, `anyrent://todo`; Intent chỉ rõ `MainActivity` + `CLEAR_TOP | SINGLE_TOP` để không chồng activity. Một lối vào trong app: `TodayWidgetLinks`, xử lý ở `AnyRentNavHost` (không xử lý khi đang ở màn đăng nhập; xử lý sau khi đăng nhập).
7. **Thêm widget:** `requestPinAppWidget` sau `isRequestPinAppWidgetSupported()`. Không có thông báo thành công. Sau khi bấm, sheet hiện chữ trung tính + các bước phòng khi máy không hỏi. Khi quay lại app mà `getAppWidgetIds` có widget thì sheet và thẻ tự đóng, im lặng.
8. **Cài đặt:** dòng "Widget" và công tắc "Ẩn tên khách trên widget" trong nhóm TÀI KHOẢN, sau Ngôn ngữ, như iOS.

## Khác iOS có chủ ý
- Android tự làm mới nền (W10). Có nút ↻.
- Có đầu widget ở cỡ vừa vì cần chỗ cho ↻ (mockup Android có).
- Không có `privacySensitive`: Android không có widget màn hình khoá, chỉ có công tắc Ẩn tên.
- Không có nhãn trong file vì không cần.

## Out of scope
Ảnh món, công tắc tiền, cỡ lớn, màn hình khoá, lịch hệ thống, API.
