# Spec — Form sản phẩm: Thuê theo lần + chọn 1 trong 2

Issue: #1249 · Intent: ./intent.md · Thay mục "Quyết định đã chốt" 1 và 21 của `../1189-day-block-pricing/spec.md` (quyết định cuối = mockup v170 chủ đã chốt). Thay UI của #1258.

## Quyết định
1. Form sản phẩm (web, iOS chuẩn, Android theo iOS): ô "Thuê theo lần" luôn có; nhóm "Giá nhiều ngày" là hai radio full width (Thuê theo ngày | Giá theo khối ngày), không thụt lề; Giá bán, Cọc mỗi món, Kho như cũ.
2. "Thuê theo ngày" được chọn: ô một giá (đ / ngày) hiện ngay dưới radio, nối liền cùng viền. "Giá theo khối ngày" được chọn: thẻ tóm tắt ngay dưới radio, bấm mở màn setup riêng (web: hộp thoại toàn màn hình nhỏ). Bên không chọn chỉ còn một hàng radio.
3. Chọn "Giá theo khối ngày" khi chưa có bảng: mở thẳng màn setup. Huỷ/quay lại không lưu: lựa chọn trước giữ nguyên. "Lưu bảng giá": bảng vào form, radio = Giá theo khối ngày. "Tắt giá theo khối ngày": radio = Thuê theo ngày, bảng bỏ (giá ngày vẫn còn).
4. Màn setup block: bảng Số ngày -> Giá (đánh số liên tục), "+ Thêm ngày N", "Thuê quá N ngày" (hai radio), "Xem thử N ngày = ...", "Tạo nhanh" (ngày đầu + mỗi ngày thêm + số ngày, sinh bảng), "Sao chép từ sản phẩm khác" (chép bảng + quy tắc quá mốc, không chép giá bán/cọc), "Lưu bảng giá", "Tắt giá theo khối ngày". Không có danh sách 3 radio.
5. Không công tắc mặc định, không nhãn Đang dùng / Chưa dùng, không hai ô giá song song. Mặc định khi tạo đơn LUÔN là Theo lần. Giỏ/đơn không đổi.

## Behavior (mỗi dòng test được)
1. Sản phẩm mới: Thuê theo ngày được chọn, ô giá ngày trống; Theo lần trống.
2. Gửi lên, chọn "Thuê theo ngày": FIXED (mặc định nếu có giá) + DAILY, không BLOCK. Chọn "Giá theo khối ngày": FIXED + BLOCK (`price` = ngày 1), không DAILY phẳng. Không có giá theo lần thì option còn lại là mặc định. `rentPrice` = giá option mặc định. Web gửi `pricingSchemaVersion: 2` mỗi lần gửi giá (để API bỏ bảng cũ khi đổi sang Thuê theo ngày).
3. Đổi radio qua lại không mất dữ liệu trong phiên (giá ngày và bảng giữ trong bộ nhớ form, chỉ cái được chọn mới gửi).
4. Mở sản phẩm: có bảng block -> Giá theo khối ngày; không có -> Thuê theo ngày (DAILY cũ giữ nguyên giá, không tự chuyển block); chỉ có giá theo lần -> Thuê theo ngày với ô giá ngày trống.
5. Chọn "Giá theo khối ngày" chưa có bảng -> mở setup; huỷ -> về lựa chọn trước.
6. Bảng nhập dở (ô trống, thiếu "cộng thêm mỗi ngày") không lưu được ở màn setup.
7. OUTLET_STAFF không sửa giá: không thấy mục giá (như hiện nay).
8. Trang chi tiết web: thẻ bảng giá chỉ đọc + nút "Sửa giá" như hiện có.

## Out of scope
API, schema, admin `packages/ui` ProductForm, giỏ/đơn/in phiếu, giá theo giờ.

## API and data
Không đổi. `.agent/api-changes/LOG.md` có một dòng "không đổi API". Payload dùng các `type` có sẵn (FIXED, DAILY, BLOCK + `pricingSchemaVersion: 2`).
