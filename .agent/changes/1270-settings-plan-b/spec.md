# Spec: Cài đặt app phương án B

Issue: #1270

| Dòng (app) | Ai thấy | Dòng phụ |
|---|---|---|
| Thông tin cửa hàng | mọi vai trò | tên cửa hàng |
| Tiền tệ | chỉ chủ shop (sửa) | VND / USD |
| Tài khoản ngân hàng | chủ shop, quản lý chi nhánh | "N tài khoản" |
| Cọc › (màn con: CÁCH THU CỌC / GIAI ĐOẠN & CHÍNH SÁCH) | mọi vai trò xem, chủ shop sửa | "Cọc 1 lần" / "Theo giai đoạn" |
| In & phiếu › (màn con: PHIẾU / MÁY IN) | mọi vai trò | "80 mm · chưa chọn máy in" |
| công tắc đặt trùng lịch | chủ shop | |
| QUẢN LÝ 4 dòng, Gói dịch vụ, Ngôn ngữ, Nâng cao | như #1259 | |

Đếm (chủ shop): 12 dòng + công tắc = 13, cùng thẻ tên và chuông. Bỏ màn con "Thu tiền".
Màn Cọc: Mẫu giai đoạn và Chính sách mờ khi chế độ "1 lần" nhưng vẫn bấm được.
Màn In & phiếu: dùng form hiện có, thêm tiêu đề section PHIẾU (ghi chú phiếu) và MÁY IN (IP, in thử). Mockup có dòng "Khổ giấy": app chưa có chỗ chọn khổ giấy nên không thêm.

## Lệch mockup (số dòng theo tab "Cài đặt app: chia lại")
- BI1 "Khổ giấy": Android có ô Khổ giấy trong section PHIẾU; iOS chưa có chỗ chọn khổ giấy nên không thêm (dòng B6 vẫn ghi "80 mm" mặc định).
- BI2 "Ghi chú phiếu", BI3 "Máy in", BI4 "In thử": màn In & phiếu dùng form hiện có chia section PHIẾU (ghi chú, in QR) và MÁY IN (IP, in thử ở thanh dưới), không đổi thành dòng bấm vào màn nữa.
- BC2: giữ tên cũ "Mẫu giai đoạn cọc"; B7 giữ chữ cũ "Cho tạo đơn khi trùng lịch".
- B2 dòng phụ là tên cửa hàng; B4 hiện "N tài khoản" khi đã biết số.
