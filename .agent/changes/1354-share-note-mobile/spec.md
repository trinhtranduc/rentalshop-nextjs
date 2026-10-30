# Spec — Ghi chú đơn trên ảnh chia sẻ (mobile)

Issue: #1354 · Status: done · Intent: ./intent.md · API: .agent/changes/1344-share-order-note-setting/spec.md

## Behavior

1. `canSetShareOrderNote(role)`: chỉ MERCHANT. Vai trò khác (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY, ADMIN) và không có vai trò: false.
2. Cờ `merchant.shareOrderNote` đọc từ `GET /api/users/profile`; thiếu khoá, null hoặc kiểu lạ = false. Đọc được thì lưu vào user đã lưu (merchant). Chưa từng đọc = false.
3. Ghi: `PUT /api/settings/merchant` `{ "shareOrderNote": true|false }`, trả `data.shareOrderNote`. Thiếu trong câu trả lời: dùng giá trị đã gửi.
4. Khối ghi chú hiện khi: ảnh của ĐƠN (thuê hoặc bán, không phải nháp) + cờ bật + ghi chú đơn sau khi bỏ khoảng trắng đầu/cuối không rỗng. Tắt, rỗng, hoặc nháp: không có khối, ảnh như #1349.
5. Khối nằm cuối phần tiền, sau mọi dòng tiền và Thế chân, trước QR và lời cảm ơn. Tiêu đề "GHI CHÚ" (en "NOTE"). Ghi chú từng món (#930) không đổi.
6. Cắt: ghi chú được ngắt dòng theo từ theo chiều rộng thật của khối (đo bằng chữ vẽ), giữ xuống dòng của người nhập, từ dài hơn một dòng thì bẻ theo ký tự. Tối đa 4 dòng; dư thì dòng 4 bị rút ngắn cho vừa kèm "…". Hàm thuần `ShareNoteClip.lines(text, maxLines, fits)`, iOS và Android cùng thuật toán.
7. Khung (a)-(g) của mockup: ghi chú bật + có ghi chú: (a)(b)(c)(d)(e) thuê, (f) bán có khối ghi chú cuối; (g) nháp không có. Tắt: giống #1349 từng dòng.
8. Làm mới cờ (tối đa mỗi phút một lần, không cần ép): app vào foreground, khi mở màn In & phiếu, ngay trước khi tạo ảnh chia sẻ. Một lần lưu đang chạy thì làm mới không ghi đè.
9. Dòng cài đặt: "Hiện ghi chú đơn trên ảnh chia sẻ" + mô tả "Ghi chú của đơn hiện ở cuối ảnh gửi khách, cả ghi chú nội bộ. Áp dụng cho cả shop." trong khối PHIẾU, dưới dòng QR. MERCHANT gạt được: gạt là lưu ngay, lỗi thì trả công tắc về giá trị cũ và báo lỗi. Vai trò khác: dòng mờ, không gạt được, thêm "Chỉ chủ shop bật/tắt." Gói Basic (chỉ điện thoại) gạt được như chủ shop.
10. Model đơn (`Codable` / `org.json`) chịu được thiếu khoá `shareOrderNote`.

## Out of scope

API, web, thứ tự tiền, chi tiết đơn, phiếu in nhiệt, ghi chú có ảnh (ảnh trong ghi chú không lên ảnh chia sẻ), theo chi nhánh.

## API and data

Không đổi API, không schema. Chỉ đọc `merchant.shareOrderNote` và ghi `PUT /api/settings/merchant` (có từ #1352).

## Acceptance

- [x] iOS `OrderShareImageTests` (lớp mới `OrderShareNoteTests`), Android `OrderShareNoteTest`: đỏ rồi xanh
- [x] Chuỗi mới en + vi-VN (iOS), values + values-vi (Android)
- [x] Ảnh thật từ Simulator (bật / tắt / vai trò khác)
