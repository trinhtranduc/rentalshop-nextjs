# Spec — Form sản phẩm: Theo lần / Theo ngày

Issue: #1249 · Intent: ./intent.md · Thay đổi so với `../1189-day-block-pricing/spec.md` mục "Quyết định đã chốt" 1 và 21 (chủ đã đổi ý 2026-10-27).

## Quyết định
1. Form sản phẩm (web, iOS, Android) có MỘT lựa chọn kiểu giá thuê: **Theo lần** hoặc **Theo ngày**. Hai dòng radio, không công tắc, không segmented.
2. **Theo lần**: một ô "Giá thuê theo lần". **Theo ngày**: bảng block hiện ngay dưới lựa chọn (ngày 1..N, quá mốc cuối, xem thử), không mở màn riêng.
3. Sản phẩm mới: Theo lần.
4. Bỏ "Khi tạo đơn, mặc định tính" (công tắc/radio) và danh sách 3 radio Theo lần / Theo ngày / Giá theo khối ở màn bảng giá. Màn riêng của iOS/Android bị xoá; trang chi tiết web dùng cùng hai lựa chọn.
5. Spec #1189 mục 1 và 21 được thay bằng mục này.

## Behavior (mỗi dòng test được)
1. Mở sản phẩm: có bảng block đã lưu (option BLOCK mặc định) -> Theo ngày + bảng đã lưu. Mặc định DAILY không bảng -> Theo ngày + bảng điền sẵn một dòng = giá ngày cũ, "mỗi ngày thêm" = giá ngày cũ (tính đúng bằng giá ngày x số ngày). Còn lại (FIXED, trống) -> Theo lần.
2. Lưu Theo lần: options = FIXED (mặc định) và DAILY giữ nguyên nếu có `perDay` cũ (không mất dữ liệu); không có BLOCK. Sản phẩm từng có bảng mà chuyển sang Theo lần: gửi `pricingSchemaVersion: 2` để API bỏ bảng.
3. Lưu Theo ngày với bảng do chủ nhập: options = BLOCK (mặc định, `price` = ngày 1) + FIXED/DAILY cũ không mặc định nếu có; `pricingSchemaVersion: 2`; `rentPrice` = giá ngày 1.
4. Lưu Theo ngày khi bảng không sửa so với bảng điền sẵn từ giá ngày cũ: gửi đúng như trước (DAILY mặc định, không BLOCK). Không đổi dữ liệu, không lỗi.
5. Theo ngày mà bảng trống và không có giá ngày cũ: chặn lưu ("Nhập bảng giá theo ngày"). Bảng nhập dở (ô trống, thiếu X khi "mỗi ngày thêm"): chặn lưu như hôm nay (`isCompleteBlockTable`).
6. Đổi qua lại Theo lần <-> Theo ngày không mất cái đã nhập trong phiên.
7. OUTLET_STAFF không sửa giá: không thấy lựa chọn này (như hiện nay).

## Out of scope
API, schema, admin `packages/ui` ProductForm, giỏ/đơn/in phiếu, giá theo giờ.

## API and data
Không đổi. `.agent/api-changes/LOG.md` thêm một dòng "không đổi API". Payload dùng các `type` hiện có.

## Screens
- Web `apps/client/app/products/form/ProductFormPage.tsx`, `[id]/BlockPricingCard.tsx`; iOS `ProductFormViewController.swift` (+ `BlockTableEditorView`, thay `BlockPriceViewController`); Android `ProductFormV2Screen.kt` (+ `BlockTableEditor`, thay `BlockPriceScreen`).
- Chuỗi mới: `block.kind.title`, `block.kind.once`, `block.kind.day` (+ en/vi/ja/ko/zh web). Bỏ dùng `products.form.defaultPricing`, `block.section.default`, `block.hint.default`, `block.turnOff`, `block.row.off`.
