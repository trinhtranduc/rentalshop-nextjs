# Spec — "Đặt lại" đơn

Issue: #1515 · Status: accepted · Intent: ./intent.md

## Behavior

1. Chi tiết đơn có hành động **Đặt lại đơn** ("Tạo giỏ mới giống đơn này"). iOS và Android: một dòng trong sheet ⋯ "Thao tác với đơn". Web: dòng đầu menu ⋯.
   Hiện ở **mọi trạng thái** đơn (kể cả đã trả, đã huỷ), cho đơn thuê và đơn bán. Chỉ hiện cho người có quyền tạo đơn (`orders.create`).
2. Bấm: tải đơn (đã có sẵn ở màn chi tiết), tải sản phẩm của từng dòng, dựng một giỏ rồi mở màn giỏ (web: trang Tạo đơn). Không gọi API ghi.
3. Giỏ mới có:
   - **loại đơn** như đơn cũ (thuê / bán);
   - **khách** như đơn cũ (khách lẻ thì không có khách);
   - **ghi chú** của đơn (văn bản; không có ảnh ghi chú);
   - **từng món và số lượng**, giá theo **giá hiện tại của sản phẩm** (thuê: giá thuê; bán: giá bán), như thêm món vào giỏ, kèm **ghi chú của từng món** nếu có;
     số ngày thuê của món tính lại theo ngày shop chọn sau, không lấy `rentalDays` của đơn cũ.
4. Giỏ mới **không có**: ngày lấy, ngày trả (để trống cả hai; đơn thuê thì mở hộp chọn ngày như một đơn thuê mới), giảm giá, cọc, thế chấp, kế hoạch thu cọc theo giai đoạn,
   khoản đã thu, thanh toán, ảnh, trạng thái, mã đơn, liên kết đơn online. Không có chế độ "đang sửa đơn": tạo đơn là `POST /api/orders` như đơn thường.
5. Món không còn tải được (dòng đơn không còn `productId`, sản phẩm đã xoá, hoặc không còn quyền xem): **bỏ khỏi giỏ**, và báo một câu "N món không còn bán, đã bỏ khỏi giỏ". Còn món khác thì vẫn mở giỏ.
   Hết món thì **không mở giỏ**, chỉ báo "Không còn món nào để đặt lại".
6. Mở giỏ: giỏ đang dùng có món (hoặc có khách) thì mở **giỏ mới bên cạnh**, giỏ cũ giữ nguyên. Giỏ đang dùng trống thì dùng luôn giỏ đó. Đã đủ 10 giỏ và giỏ đang dùng có món:
   báo như "Xác nhận đơn online" (`cart.multi.limit`), không làm gì khác.
7. Số lượng lớn hơn tồn kho hiện tại: giỏ báo thiếu như mọi giỏ (không chặn).
8. Web: đường dẫn `/orders/create?reorder=<mã đơn>`; sau khi đọc, bỏ tham số khỏi URL (tải lại không tạo thêm giỏ), như `?bookingRequestId=` (#1293).
9. i18n: web `locales/{en,vi,ja,ko,zh}`; iOS và Android các chuỗi: tên hành động, mô tả, hai thông báo (mục 5), thông báo đủ giỏ có sẵn.

Ca ví dụ (giá hiện tại: Váy A 250.000/ngày, Áo B 80.000/ngày; hôm đó đơn cũ tính Váy A 200.000):
| Ca | Đơn cũ | Giỏ mới |
|---|---|---|
| 1 | Thuê, khách An, Váy A ×1 + Áo B ×2, ghi chú "Giao trước 8h", giảm 50.000, cọc 300.000, thế chấp CCCD, 10–12/10, đã trả | Giỏ thuê, khách An, Váy A ×1 (250.000) + Áo B ×2 (80.000), ghi chú "Giao trước 8h". Không giảm giá, cọc, thế chấp. Ngày trống, mở hộp chọn ngày |
| 2 | Bán, khách lẻ, Áo B ×3 | Giỏ bán, không khách, Áo B ×3 theo giá bán hiện tại |
| 3 | Thuê, Váy A đã xoá khỏi shop, Áo B ×2 | Giỏ có Áo B ×2; báo "1 món không còn bán, đã bỏ khỏi giỏ" |
| 4 | Thuê, chỉ có Váy A (đã xoá) | Không mở giỏ; báo "Không còn món nào để đặt lại" |
| 5 | Đơn đã huỷ | Vẫn đặt lại được, như ca 1 |
| 6 | Giỏ đang dùng có 2 món | Mở giỏ mới (giỏ 2); giỏ cũ còn nguyên 2 món |
| 7 | Giỏ đang dùng trống | Giỏ đó được điền, không thêm giỏ |
| 8 | Đã mở 10 giỏ, giỏ đang dùng có món | Báo đủ giỏ; không đổi gì |
| 9 | Người dùng không có `orders.create` | Không thấy hành động |

## Out of scope

Đặt lại hàng loạt từ danh sách đơn; sao chép giảm giá, cọc, thế chấp, ngày; chỉnh sửa đơn cũ; giữ giá cũ; ảnh ghi chú; đơn online (booking request).

## API and data

Không đổi. Đọc `GET` chi tiết đơn và `GET` sản phẩm có sẵn; tạo đơn `POST /api/orders` như hiện nay. Không migration, không biến môi trường.

## Acceptance

- [ ] Hàm dựng giỏ (web `reorder-model`, iOS `ReorderCartBuilder`, Android `ReorderCart`) qua đủ ca 1–5 bằng test đơn vị.
- [ ] Mở giỏ: ca 6–8 qua test đơn vị của `CartStore` / `cart-store`.
- [ ] Web, iOS (Simulator có cửa sổ), Android (AVD có cửa sổ): đặt lại một đơn thuê và một đơn bán, tạo đơn xong thấy đúng khách, món, giá hiện tại, ngày đã chọn.
- [ ] Vị trí trong sheet theo mockup chủ shop chọn.
