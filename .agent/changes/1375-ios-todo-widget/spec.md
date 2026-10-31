# Spec — PR-1 iOS widget "Việc cần làm"

Issue: #1375 · Status: in-progress. Hành vi đánh số 1 đến 15 và dữ liệu (mục 4, 5) nằm ở `.agent/changes/1372-widget-calendar/spec.md`. Ở đây chỉ ghi phần chọn lúc code.

1. Dữ liệu chia sẻ: static lib `DraftOrderActivity` (Swift 5): `TodayWidgetSnapshot` (file), `TodayWidgetDisplay` (hàm thuần: file + giờ -> thứ widget vẽ), `TodayWidgetLink` (phân tích URL), `TodayWidgetStore` (file trong App Group), `TodayWidgetBridge` (app gọi).
2. Dựng file từ `TodayWork` ở phía app (`Model/TodayWidgetData.swift`) dùng `OrdersHomeLogic.todaySections`: dòng "Thu cọc" (đợt cọc) và "Ngày mai" không vào widget; số đếm là `count` của API.
3. Widget thêm vào extension `AnyRentLiveActivity` sẵn có (`TodayWorkWidget.swift`), `systemSmall` + `systemMedium`, chỉ đọc file. Entry thứ hai đặt ở nửa đêm giờ Việt Nam để tự đổi sang "Cũ".
4. Nhãn do app ghi sẵn theo ngôn ngữ app; chưa mở app lần nào thì dùng bộ nhãn dự phòng vi/en theo ngôn ngữ máy. Đăng xuất ghi file "loggedOut" chỉ có nhãn (không dữ liệu shop).
5. Làm mới ghi file: mở app, đổi chi nhánh, tạo/lấy/trả/huỷ đơn (`OrdersChangeSignal`), đổi công tắc Ẩn tên, sau đăng nhập. Lỗi mạng giữ file cũ.
6. Deep link: `AppDelegate` tách theo host (`order`, `todo`, còn lại là giỏ nháp).
7. Thẻ gợi ý: chỉ khi iOS 16.1 trở lên, có việc hôm nay, chưa có widget, chưa "Không hỏi lại", tài khoản có Việc cần làm. Dòng "Widget" trong Cài đặt (nhóm TÀI KHOẢN, sau Ngôn ngữ) chỉ hiện từ iOS 16.1.
8. iOS 15: extension nhắm 16.1 nên không có widget; app chạy bình thường, không thẻ gợi ý, không dòng Cài đặt, không ghi file.

## Out of scope
Android (PR-2), lịch hệ thống (PR-3), widget lớn / màn hình khoá, ghim từng đơn, API, tự làm mới khi chưa mở app.

## P2 · Thẻ có màu (#1378, cùng nhánh, cùng PR)

Chủ shop chọn Phương án 2 (spec 1372 mục 1c, 9). Phần dữ liệu và logic (`DraftOrderActivity/TodayWidget*.swift`, `Model/TodayWidgetData.swift`) tách khỏi views (`AnyRentLiveActivity/TodayWorkWidget.swift`): đổi thiết kế sau này chỉ sửa views.

- Nhỏ: vòng tiến độ "xong N/M" (`done` / (`done` + còn lại)) và 3 ô số Trễ đỏ `B91C1C`, Giao xanh `1D4ED8`, Trả cam `C2410C`. Vừa: dải 3 ô số, 2 việc (mỗi việc 2 dòng), chân "xong N/M · +K việc khác · cập nhật hh:mm".
- Dòng 1: chip (TRỄ / GIAO / TRẢ, biểu tượng), tên khách, "Trễ N ngày" (đậm đỏ) hoặc "Hôm nay · 14:00" (có giờ) / "Hôm nay". Dòng 2: tên món đầu "+N" và "Chưa soạn đồ" (chữ cam + biểu tượng cảnh báo, không nền, chỉ dòng GIAO); dòng trễ không cảnh báo thì ghi ngày hẹn "Lấy 28/10/26".
- Snapshot v2 thêm: `done`; mỗi dòng thêm `moreCount`, `planTime`, `planDay`; `product` là tên món đầu không kèm số lượng. Vẫn không token, tiền, SĐT, ảnh.
- `done` = `doneToday.pickups + doneToday.returns` của `GET /api/analytics/outlet-operations`: `packages/database/src/outlet-operations.ts:86-87,106` (đếm đơn có `pickedUpAt` / `returnedAt` trong ngày VN, không tính CANCELLED), trả ở `apps/api/app/api/analytics/outlet-operations/route.ts:197`; iOS đã đọc ở `Model/OverviewV2.swift:646-652`. Không đổi API. API cũ không có `doneToday` thì `done` = 0.
- `planTime` rỗng khi giờ VN là 00:00 đúng (cách app lưu đơn chỉ có ngày); `planDay` theo ngày VN.
- "Xong hết N/N" chỉ khi `done` ≥ 1 và không còn việc; `done` = 0 và không còn việc là "Hôm nay chưa có việc".
- Ngoài phạm vi: ảnh món, công tắc "còn thu" (D3), cỡ lớn, widget màn hình khoá.
- Ảnh chụp Simulator của P2: không chụp, theo yêu cầu của chủ shop.
