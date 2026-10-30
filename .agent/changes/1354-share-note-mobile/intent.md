# Intent — Ghi chú đơn trên ảnh chia sẻ (iOS + Android)

Issue: #1354 · Refs #1344 · Status: done

## Vì sao

API và web đã có công tắc `shareOrderNote` của shop (#1344, PR #1352). Điện thoại chưa có chỗ bật/tắt và chưa vẽ ghi chú đơn lên ảnh chia sẻ, nên chủ shop dùng ghi chú đơn để nhắn khách chưa làm được trên app (kể cả gói Basic, chỉ có điện thoại).

## Chủ shop muốn

Mockup đã chốt (tab "★ Ảnh chia sẻ đơn: thứ tự tiền", mục 4 và 5): một dòng công tắc "Hiện ghi chú đơn trên ảnh chia sẻ" ở Cài đặt, nhóm "In & phiếu", mặc định tắt, chỉ chủ shop gạt. Bật thì đơn có ghi chú có khối "GHI CHÚ" (tối đa 4 dòng, cắt có "…") ở cuối ảnh, trên QR và lời cảm ơn.

## Ràng buộc

- Không đổi API, không đổi thứ tự tiền (#1349), không đụng chi tiết đơn (#1350), phiếu in nhiệt, phiếu web.
- Bài học #1307: app đọc lại cờ qua `GET /api/users/profile` (foreground, mở màn, trước khi tạo ảnh, tối đa mỗi phút một lần), nếu không nhân viên thấy giá trị cũ. Chưa đọc được = tắt.
- iOS là chuẩn; Android đổi cho giống iOS.
