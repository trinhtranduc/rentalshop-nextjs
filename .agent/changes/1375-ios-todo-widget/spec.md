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
