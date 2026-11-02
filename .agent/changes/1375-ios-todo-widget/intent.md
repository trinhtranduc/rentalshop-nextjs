# Intent — Widget "Việc cần làm" trên iPhone (PR-1 của epic #1372)

Issue: #1375 · Epic: #1372 · Spec gốc (đã merge): `.agent/changes/1372-widget-calendar/{intent,spec,plan}.md` · Status: in-progress · Created: 2026-10-31

## Problem
Muốn biết hôm nay giao đồ nào, nhận trả đồ nào, đơn nào trễ thì phải mở app, vào tab Đơn, mục "Việc cần làm".

## Outcome (kiểm được)
- Widget iPhone nhỏ (3 con số) và vừa (số đếm + 3 dòng + "+N việc khác"), tự hiện việc hôm nay: Trễ, Giao, Trả.
- Trạng thái trống / chưa đăng nhập / không quyền / cũ ("Mở app để cập nhật", không bao giờ hiện danh sách hôm qua như hôm nay).
- Chạm dòng mở `anyrent://order/<id>`, chạm đầu widget mở `anyrent://todo`; link giỏ nháp cũ vẫn chạy.
- Hướng dẫn "Thêm vào widget" + thẻ gợi ý một lần ("Không hỏi lại") + dòng Widget và công tắc "Ẩn tên khách trên widget" trong Cài đặt.
- Không tiền, không SĐT trong dữ liệu widget.

## Constraints
- Quyết định W1 đến W12 đã chốt (chủ shop, 2026-10-31); xem spec 1372. Không đoán lại.
- App ghi một file JSON vào App Group, extension chỉ đọc; không token, không gọi API, không Keychain.
- Ngày theo `Asia/Ho_Chi_Minh`. Không đổi ký/provisioning (chủ shop đăng ký App Group và provisioning 4 bundle id trước TestFlight).
- Không API mới, không đổi app cũ (`api-compat-review`: No API change). Android làm ở PR-2.
