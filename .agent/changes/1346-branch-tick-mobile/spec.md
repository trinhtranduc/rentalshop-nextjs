# Spec — "Hiện ở chi nhánh" trên điện thoại

Issue: #1346 · Status: in-progress · Intent: ./intent.md · Plan: ./plan.md · Cha: `../1335-multi-outlet-products/spec.md` (quy tắc 1-14, 28)

## Quy tắc (mỗi dòng có test thuần, cùng tên trên iOS `BranchListing` và Android `BranchListing`)

1. `canSet(role)`: chỉ MERCHANT (API cho cả ADMIN hệ thống; app điện thoại không có vai trò đó).
2. `showsTick(role, activeOutletCount, productOutletRows)`: chủ shop khi shop có từ 2 chi nhánh active; vai trò chi nhánh khi sản phẩm có dòng tồn ở từ 2 chi nhánh (app không đếm được chi nhánh của shop, giống web); shop một chi nhánh và Basic: không.
3. `sendsListed(role, activeOutletCount)`: vai trò chi nhánh có (trừ khi biết chắc shop chỉ có 1 chi nhánh active); chủ shop không bao giờ.
4. Danh sách sản phẩm (tab Sản phẩm, quét mã) gửi `listed=true` khi `sendsListed`; chọn món khi tạo đơn dùng cùng danh sách. Kiểm trùng mã vạch trong form KHÔNG gửi `listed`.
5. `isListedAt(product, outletId)`: dòng tồn của chi nhánh có `isListed != false` (thiếu trường = hiện, như app/API cũ).
6. Chủ shop: món chưa tick ở chi nhánh đang chọn có nhãn "Chưa hiện ở chi nhánh này", không thêm vào giỏ được, quét mã báo "Chi nhánh này chưa hiện món này".
7. `reminder(stock, renting)`: chỉ khi còn tồn hoặc đang thuê: "Còn N cái ở chi nhánh này (M đang thuê), vẫn tính vào tổng nhưng không hiện khi tạo đơn." (không có `đang thuê` khi M = 0). Không chặn lưu.
8. Tạo sản phẩm: chủ shop gửi `outletStock[]` với `isListed` (tick sẵn chi nhánh đang chọn); vai trò chi nhánh không gửi `isListed` (server tự tick chi nhánh tạo). Sửa: sau khi lưu sản phẩm, mỗi chi nhánh đổi ô tick gọi `PUT /api/products/listing`; lỗi: báo "Đã lưu sản phẩm nhưng chưa lưu được ô Hiện ở chi nhánh. Thử lại.".
9. Header: `ClientCapabilities.tokens` có `branch-listing` (iOS `X-Client-Capabilities`, Android cùng).
10. Chuỗi en + vi: dùng lại chữ web (`locales/*/products.json` `form.listing.*`).

## Chỗ lệch mockup (chọn cách ít thay đổi nhất)

- B2b (quản lý / kho thêm món) hiện ô mờ khi thêm: app không biết shop có nhiều chi nhánh ở màn thêm (API chỉ trả chi nhánh của họ), nên màn thêm của vai trò chi nhánh giữ như cũ (web làm giống: `1335/plan.md` mục "lệch spec" 7). Ô mờ hiện ở màn sửa khi sản phẩm có dòng tồn ở từ 2 chi nhánh.
- B5b (nhân viên): ô mờ nằm ở chi tiết sản phẩm (nhân viên không có form sửa).
- B1 chủ shop: mockup nói chủ shop có cùng màn "chỉ món đã tick"; quyết định của chủ shop (người giao việc) là chủ shop xem mọi sản phẩm kèm nhãn, để tick lại được món đã bỏ tick ngay trên điện thoại.
- Cờ `branchProducts` của `GET /api/mobile/app-config`: chưa đọc (API chưa có ai dùng cờ này; nếu môi trường đặt danh sách `MOBILE_FEATURES` tường minh thì cờ tắt và app vẫn chạy theo token). Ghi vào PR.

## API compatibility

Không đổi API. Route đã có từ #1341: `GET /api/products?listed=true`, `PUT /api/products/listing`, `POST /api/products` (`outletStock[].isListed`). App cũ không gửi `listed` / token / `isListed` nên không thấy gì đổi. Bảng đầy đủ nằm trong PR.
