# Spec — Chủ shop sửa thông tin shop và chi nhánh trên điện thoại

Issue: #1313 · Status: in-progress · Intent: ./intent.md

## Behavior

1. Tên dòng ở Cài đặt (khối CỬA HÀNG): MERCHANT "Thông tin cửa hàng"; mọi vai khác "Thông tin chi nhánh".
2. MERCHANT bấm dòng: màn hai khối. Khối CỬA HÀNG: tên, "SĐT · MST mã", địa chỉ ghép (số nhà đường, phường/quận, tỉnh/thành phố), nút Sửa; dòng Tiền tệ (như hiện nay, chỉ chủ shop). Khối CHI NHÁNH · n (bấm để sửa): mỗi dòng tên (+ "Chính" cho chi nhánh mặc định), địa chỉ, SĐT, mũi tên. Bỏ chi nhánh đã tắt.
3. Sửa cửa hàng: ô tên (bắt buộc), SĐT, MST, ĐỊA CHỈ (số nhà đường, phường/quận, tỉnh/thành phố), KHÁC (quốc gia, mã bưu chính, mô tả). Lưu = `PUT /api/settings/merchant` với các trường đó (chuỗi đã cắt khoảng trắng, trống = xoá), không gửi website. Thành công: cập nhật bản lưu của user và hiện lại màn.
4. Sửa chi nhánh (chủ shop bấm một chi nhánh): "Thuộc cửa hàng <tên>", ô tên (bắt buộc), SĐT, địa chỉ (bắt buộc). Lưu = `PUT /api/outlets?outletId=<id>` `{name, phone, address}`.
5. OUTLET_ADMIN: dòng "Thông tin chi nhánh" mở thẳng form chi nhánh của mình ("Chi nhánh của bạn · thuộc cửa hàng …"), sửa và Lưu được.
6. OUTLET_STAFF, OUTLET_INVENTORY: cùng màn nhưng chỉ xem ("Bạn chỉ xem được mục này."), ô khoá, không nút Lưu.
7. Hết lỗi "Outlet ID not found" / `no_outlet_assigned` cho chủ shop: không còn đường nào của chủ shop đi qua id chi nhánh của tài khoản.
8. Danh sách chi nhánh của chủ shop: `GET /api/outlets?limit=200` (mặc định API là 50), chỉ chi nhánh đang hoạt động.
9. Không thêm/tắt chi nhánh, không mô tả chi nhánh, không email shop, không Website.

## API and data

Không đổi API, schema, response. Xác minh trong plan.md.

## Acceptance

- [ ] Test đơn vị iOS (`ShopInfoTests`) và Android (`ShopInfoLogicTest`): hàm vai trò, ghép địa chỉ, kiểm hợp lệ, payload
- [ ] iOS `xcodebuild … build` + test mới; Android `assembleDebug` + `testDebugUnitTest`
- [ ] Kiểm trực quan (Simulator/emulator + API cục bộ) hoặc ghi rõ chưa
- [ ] Chuỗi mới en + vi (iOS), values + values-vi (Android)
