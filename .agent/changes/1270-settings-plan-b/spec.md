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
