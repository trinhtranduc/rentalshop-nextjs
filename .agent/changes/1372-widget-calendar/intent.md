# Widget "Việc cần làm" và đồng bộ lịch hệ thống

Issue: #1372 (spec: #1373) · Author: Trinh Tran · Status: widget accepted (2026-10-31); lịch hệ thống chờ · Created: 2026-10-31

Mockup: https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 → hai tab mới ngay sau "★ Chi tiết đơn":
"★ Widget: Việc cần làm" và "★ Thêm vào lịch hệ thống".

## Thứ tự đã chốt (chủ shop, 2026-10-31)

1. **Làm widget trước**, iOS trước, Android giống iOS. Phần này độc lập, đủ để phát hành riêng.
2. **Đồng bộ lịch hệ thống làm sau.** Chưa làm, chờ widget xong. Tài liệu này chỉ giữ phương án và câu hỏi cho phần lịch, không vẽ chi tiết thêm.

## Problem

Yêu cầu nguyên văn của chủ shop:

> "Hiện tôi muốn phần việc cần làm ở order tab sẽ có thể add vào widget, và phần calendar có thể bổ sung vào trong todo để có thể đồng bộ với calendar của hệ thống."

Hôm nay muốn biết giao đồ nào, nhận trả đồ nào, đơn nào trễ thì phải mở app, vào tab Đơn hàng, mục "Việc cần làm". Danh sách này chỉ tải khi mở app và không được lưu lại: iOS `OrdersHomeViewModel.swift:858-877` (không có cache, lỗi mạng thì hiện lỗi), Android `DefaultTodayWorkRepository.kt:23-25` (chỉ gọi mạng). Ngày giao/trả cũng chỉ có trong tab Lịch của app, không có trong lịch của máy.

Hai ý được hiểu như sau (chưa rõ chi tiết, **chưa tự chốt**):

- **(A) Widget** màn hình chính hiện "Việc cần làm" của hôm nay.
- **(B) Lịch hệ thống:** ngày giao/trả đưa vào lịch của máy (iOS Calendar, Google Calendar).

## Proposed outcome

Phần 1, widget (làm trước). Kiểm được không cần người:

- Thêm widget AnyRent một lần thì nó luôn hiện việc hôm nay (đã chốt A1: tự hiện, không ghim). Hiện số đếm "N giao · N trả · N trễ" và vài dòng việc, cùng chữ và màu thẻ như tab Việc cần làm.
- Trống hiện "Hôm nay chưa có việc"; chưa đăng nhập hiện "Mở AnyRent để đăng nhập"; qua nửa đêm giờ Việt Nam mà chưa cập nhật thì hiện "Mở app để cập nhật", không bao giờ hiện danh sách của hôm qua như hôm nay.
- Chạm một dòng mở đúng đơn; chạm đầu widget mở tab Đơn hàng, mục Việc cần làm.
- Widget không hiện tiền, không hiện số điện thoại. Đăng xuất thì xoá dữ liệu widget.

Phần 2, lịch hệ thống (làm sau, chưa chốt): đề xuất B1, nút "Thêm vào lịch" ở chi tiết đơn (ngày lấy / ngày trả, sự kiện cả ngày). Xem `spec.md` mục 8.

## Affected users and systems

- Vai trò: `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY` (đều có `analytics.view.dashboard`, `packages/auth/src/permissions.ts:169-274`).
- App: iOS (`apps/mobile`), Android (`apps/mobile-android`). **Không** đụng `apps/api`, `packages/`, `prisma/` ở phần widget.
- Dữ liệu: `GET /api/analytics/outlet-operations` (đã có, `apps/api/app/api/analytics/outlet-operations/route.ts:131`).
- Apple Developer: App Group mới (việc của chủ shop).

## Constraints

- "Đơn giản và chuẩn": bản đầu một widget nhỏ + vừa (iOS), một widget (Android); không ghim, không cài đặt phức tạp.
- iOS là chuẩn; Android đổi theo iOS (chữ, thứ tự, trạng thái).
- Ngày theo `Asia/Ho_Chi_Minh` (skill `timezone-dates`), không dùng ngày UTC cho "hôm nay".
- Riêng tư: không tiền, không SĐT; tên khách dùng `privacySensitive` trên iOS; công tắc "Ẩn tên khách".
- Gói Basic chỉ dùng điện thoại: mọi thứ cấu hình được ngay trong app.
- Khách đang cài app cũ không bị ảnh hưởng: widget nằm trong app mới, không đổi API (`api-compat-review`: No API change).
- iOS: token truy cập sống 1 giờ và refresh token đổi mỗi lần refresh (`AuthSession.swift:87`, Android `ApiClient.kt:82`), nên **extension không tự gọi API**; app ghi sẵn dữ liệu cho widget đọc.

## Open questions

- Phần widget: **không còn câu mở**; mọi quyết định (W1 đến W12) đã chốt, xem `spec.md` mục 1a.
- Phần lịch hệ thống (làm sau): L1 và L2 ở `spec.md` mục 1b, chưa chốt.

## Decision log

- 2026-10-31 — Làm widget trước, đồng bộ lịch hệ thống làm sau; cùng epic #1372, tài liệu #1373 (chủ shop)
- 2026-10-31 — Widget không cần API mới ở bản đầu: app ghi dữ liệu vào App Group (iOS), Android tự tải bằng WorkManager (đã chốt cùng W1 đến W12)
- 2026-10-31 — Chủ shop chốt phần widget theo mặc định đơn giản nhất: A1 tự hiện (A2 để sau); sheet "Thêm vào widget" chỉ là hướng dẫn (iOS 3 bước; Android `requestPinAppWidget`) và một thẻ gợi ý hiện một lần trong tab Đơn có "Không hỏi lại"; cỡ, số dòng, riêng tư, chạm, vai trò, iPad, trạng thái, làm mới như spec 1a (chủ shop, "chốt theo mặc định")
- 2026-10-31 — Lịch hệ thống vẫn chờ, làm sau widget (chủ shop)
