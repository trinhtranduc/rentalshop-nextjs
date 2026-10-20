# Intent — Đặt đơn online (#1124)

Issue: #1124 · Status: draft, chờ chủ shop duyệt plan · Mockup: tab "Đặt đơn online"
(https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4, nguồn `mcbooking.html`)

## Vấn đề
Khách xem trang shop công khai `/{tenantKey}/products` (ảnh, giá, Gọi shop / Hỏi qua Zalo) nhưng không đặt thuê
được: phải gọi hoặc nhắn, shop gõ lại đơn bằng tay, dễ sót ngày và món.

## Kết quả mong muốn
Khách tự gửi **yêu cầu đặt thuê** (chi nhánh, ngày lấy – trả, món, số lượng, tên, số điện thoại, ghi chú) và theo
dõi bằng mã. Shop thấy yêu cầu trên web, iOS, Android, **Xác nhận** để ra đơn Đã đặt (RESERVED) bằng đúng luồng
tạo đơn hiện có, hoặc **Từ chối** có lý do.

## Quyết định
- Không thanh toán online (chủ shop chốt 2026-10-20).
- Ba mặc định — **đề xuất, chủ shop xác nhận khi duyệt plan**:
  1. Yêu cầu → shop xác nhận mới thành đơn (không tạo đơn ngay khi khách gửi).
  2. Khách không cần tài khoản: tên + số điện thoại (bắt buộc) + ghi chú.
  3. Không giữ hàng khi chờ: kiểm tra còn trống lúc khách gửi và lúc shop tạo đơn.
- Yêu cầu lưu ở bảng riêng, không phải `Order`: số đơn, doanh thu, lịch, còn trống và app đã cài không đổi.

## Ràng buộc
- App đã cài không cập nhật bắt buộc: chỉ thêm bảng, route, trường tuỳ chọn (`api-compat-review`).
- Ngày theo lịch Việt Nam (`timezone-dates`): ngày lấy và ngày trả cùng ngày vẫn chiếm ngày đó.
- Màn mobile mới sau khoá `MOBILE_FEATURES` mới; dev trước, production sau.
- Giữ đơn giản: không thêm màn ngoài mockup.

## Người dùng và hệ thống bị ảnh hưởng
Khách của shop (web công khai), chủ shop / nhân viên chi nhánh (web client, iOS, Android), API, DB (migration
thêm mới), thông báo đẩy.

## Decision log
- 2026-10-20 — không thanh toán online; mockup 6 màn duyệt; plan này chờ duyệt.
