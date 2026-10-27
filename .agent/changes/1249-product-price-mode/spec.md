# Spec — Form sản phẩm: ba loại giá thuê cùng tồn tại

Issue: #1249 · Intent: ./intent.md · Thay mục "Quyết định đã chốt" 1 và 21 của `../1189-day-block-pricing/spec.md` và thay UI của #1258/#1260 (chọn 1 trong 2). Mockup v179 (tab 1, ca 1.1 ... 4.7).

## Quyết định
1. Mục GIÁ THUÊ (web, iOS chuẩn, Android theo iOS), dọc, full width, không thụt lề: "Theo lần" (đ / lần), "Theo mỗi ngày" (đ / ngày), "Theo block ngày" (tóm tắt hoặc "Chưa cài", bấm mở màn setup riêng; web: hộp thoại). Rồi Giá bán | Cọc mỗi món, mục Kho, nút Lưu.
2. Không radio chọn kiểu, không công tắc mặc định, không nhãn Đang dùng / Chưa dùng. Ba loại cùng điền được. Mở màn setup chỉ bằng bấm dòng block; huỷ/quay lại không lưu thì dòng block giữ nguyên.
3. Màn setup block: bảng Số ngày -> Giá, "+ Thêm ngày N", "Thuê quá N ngày" (Cộng thêm mỗi ngày: X | Giữ nguyên giá khối cuối), "Xem thử N ngày = ...", "Sao chép từ sản phẩm khác" (chép bảng + quy tắc quá mốc), "Lưu bảng giá" (bảng vào form), "Tắt giá theo khối ngày" (bỏ bảng, dòng về "Chưa cài"; giá theo lần/ngày không đổi). Không "Tạo nhanh".
4. Giỏ/đơn không đổi: menu giá của dòng hiện bấy nhiêu loại giá sản phẩm có; mặc định Theo lần.

## Behavior (mỗi dòng test được)
1. Sản phẩm mới: ba loại trống, block "Chưa cài".
2. Gửi lên: FIXED (nếu có giá/lần) + DAILY (nếu ô ngày có giá; để trống = không gửi DAILY) + BLOCK (nếu có bảng đầy đủ), đủ cả ba cùng lúc. `isDefault` = FIXED; khi không có giá/lần thì loại đầu tiên còn lại (như cũ). `rentPrice` = giá của option mặc định. Luôn `pricingSchemaVersion: 2` (để "Tắt block" làm API bỏ bảng cũ).
3. Tắt block -> không BLOCK trong payload. Bảng nhập dở không lưu được ở màn setup (như hiện nay).
4. Mở sản phẩm: có DAILY -> ô ngày có giá; có BLOCK -> dòng block hiện tóm tắt; chỉ có giá theo lần -> ô ngày trống, block "Chưa cài". Sản phẩm DAILY cũ giữ giá ngày, không tự thành block.
5. OUTLET_STAFF không sửa giá: không thấy mục giá (như hiện nay).
6. Trang chi tiết web: thẻ bảng giá chỉ đọc + nút "Sửa giá" như hiện có.

## Đối chiếu app cũ (API không đổi)
Một sản phẩm có đủ FIXED + DAILY + BLOCK đã được thiết kế cho phép ở #1189 (BLOCK sống cạnh FIXED/DAILY, một dòng `ProductPricingOption` riêng):
- Đọc (app không có capability `block-pricing`): `apps/api/lib/block-pricing-legacy.ts:19-35`: sản phẩm có FIXED thật thì option BLOCK bị bỏ khỏi danh sách; app cũ thấy FIXED + DAILY như trước, `rentPrice` = giá của option mặc định (FIXED). Sản phẩm không có FIXED (chỉ DAILY + BLOCK): BLOCK hiện là FIXED giá ngày 1.
- Ghi: `packages/database/src/product.ts:1389-1465` + `product-pricing-normalize.ts:14-45`: app cũ không gửi `pricingSchemaVersion` nên `keepBlockOptions`: xoá chỉ option khác BLOCK (`pricingOptionsDeleteWhere`), BLOCK được giữ; hàng FIXED lặp từ BLOCK chỉ bị bỏ khi chưa có FIXED thật (`withoutEchoedBlockShim`), nên với FIXED thật không sinh hàng thừa.
- Đơn: option mặc định là FIXED nên dòng của app cũ không bị nhận là BLOCK để tính lại (spec #1189 mục 6); chỉ khi chọn rõ option BLOCK (client mới) mới tính theo bảng.
- Test: `tests/block-pricing-api.test.ts` (thêm ca FIXED + DAILY + BLOCK).
Kết luận: an toàn, không cần sửa API.

## Out of scope
API, schema, admin `packages/ui` ProductForm, giỏ/đơn/in phiếu, giá theo giờ.

## API and data
Không đổi. `.agent/api-changes/LOG.md` có một dòng "không đổi API".

## Cập nhật (#1266)
Bỏ "Tạo nhanh" khỏi màn setup block (web, iOS, Android); gộp vào PR này.
