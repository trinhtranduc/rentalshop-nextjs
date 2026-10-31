# Biến thể sản phẩm (size, màu, SKU, tồn kho theo biến thể)

Issue: #1305 · Author: Trinh Tran · Status: draft · Created: 2026-10-28

## Problem

Hôm nay một sản phẩm chỉ có một dòng tồn kho theo chi nhánh (`OutletStock`, `prisma/schema.prisma:350-364`) và một bộ giá (`Product.rentPrice`, `ProductPricingOption`, `schema.prisma:269-326`). Tiệm cho thuê váy cưới, áo dài, giày, trang phục có cùng một mẫu nhưng nhiều size và màu. Họ phải tạo nhiều sản phẩm gần giống nhau ("Váy A - M - Đỏ", "Váy A - L - Đỏ"):

- danh sách sản phẩm dài và lặp, ảnh và mô tả nhập lại nhiều lần;
- tìm kiếm (kể cả tìm bằng hình ảnh, `apps/api/app/api/products/searchByImage/route.ts`) ra nhiều kết quả giống nhau;
- khách hỏi "mẫu này còn size M ngày 15 không" thì nhân viên phải mở từng sản phẩm.

Chưa có số liệu đo tần suất; đây là yêu cầu của chủ shop.

## Proposed outcome

Kiểm chứng được mà không cần người:

1. Tạo một sản phẩm với 3 biến thể ("S", "M", "L"); mỗi biến thể có tồn kho riêng ở từng chi nhánh. Tổng tồn của sản phẩm (`totalStock`, `outletStock[]` hiện có) bằng tổng các biến thể.
2. Tạo đơn thuê chọn biến thể "M" cho 15/11: "Kiểm tra còn trống" và "Lịch trống" cho M giảm 1 trong đúng các ngày dân sự Việt Nam từ lấy đến trả (tính cả ngày lấy và ngày trả); S và L không đổi.
3. Sau khi đơn tạo, đổi tên biến thể M thành "M2" hoặc xoá biến thể M: đơn cũ vẫn hiện "M" (snapshot ở dòng đơn).
4. Sản phẩm không có biến thể: mọi response và hành vi của API giống từng byte với bản đang chạy ở `main-real` (golden test).
5. Một bản iOS / Android cài từ `main-real` (release-2026-10-12.2) vẫn đăng nhập, xem sản phẩm, tạo đơn, sửa đơn, lấy hàng, trả hàng, in phiếu với cả sản phẩm có biến thể mà không vỡ màn hình nào.

## Affected users and systems

- Vai trò: `MERCHANT`, `OUTLET_ADMIN` (tạo/sửa biến thể), `OUTLET_INVENTORY` (sửa tồn như sản phẩm), `OUTLET_STAFF` (chọn biến thể khi tạo đơn; vẫn không sửa giá, AGENTS.md).
- Ứng dụng: `api`, `client` (web), iOS, Android, trang công khai `/{tenantKey}/products`. `admin` không đổi ở giai đoạn 1.
- Dữ liệu: `Product`, `OutletStock`, `OrderItem`, `BookingRequestItem`, vector ảnh Qdrant (không đổi ở giai đoạn 1).

## Constraints

- Additive only (AGENTS.md "API compatibility"): không xoá, đổi tên, đổi kiểu hay đổi nghĩa field nào app cũ đọc. Sản phẩm không có biến thể chạy y như cũ.
- Khách đang cài app cũ không ép cập nhật được; dùng header `X-Client-Capabilities` (`apps/api/lib/client-capabilities.ts:12-46`) cho phần mới, đúng cách #1189 / #1199 đã làm.
- Migration additive, code cũ chạy được trên schema mới (`db-migration`).
- Ngày: múi giờ Việt Nam, `getUtcRangeForDateKeys`, `occupiedDateKeysForRange` (`timezone-dates`).
- iOS là chuẩn mobile, Android làm theo (`mobile-parity`).
- Chủ shop: "đơn giản và chuẩn, đừng phức tạp". Mockup trước, chủ chốt rồi mới code.
- Giai đoạn 1 chỉ làm **biến thể**. Từng tài sản cụ thể (một chiếc váy có QR riêng, theo dõi hao mòn từng chiếc) là việc khác, không làm ở đây.

## Open questions

Xem mục "Cần chủ shop chốt" cuối `spec.md` (6 câu, mỗi câu có mặc định đề xuất).

## Decision log

- 2026-10-28 — Mở issue #1305 và viết spec; chưa viết mã (Trinh Tran, theo yêu cầu của chủ repo)
