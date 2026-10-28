# Intent #1200: hạ tầng bảo vệ app cũ

Status: in-progress

## Vì sao
Thu cọc theo giai đoạn và giá theo khối ngày sẽ tạo dữ liệu mà app đã cài (`main-real`, không ép cập nhật được) chưa hiểu. E2E app cũ thật (2026-10-25, `drafts-installments/e2e-old-app-baseline.md`) cho thấy:
- iOS cũ **không mở được đơn có bất kỳ `Payment` nào** (notes NULL / PICKUP / INSTALLMENT). Struct `Payment` (`Order.swift:971-976`) bắt buộc `paymentMethod`, `paymentDate`; API chỉ trả `method`, `processedAt`. Đây là lỗi có sẵn, không do tính năng mới.
- Sửa sản phẩm có option BLOCK từ iOS/Android cũ gửi `pricingOptions: []`, `rentPrice: 0`, `salePrice: 0`: option BLOCK bị xoá và `rentPrice` về 0.
- Chưa có cách nhận biết client mới/cũ; `GET /api/payments` (admin) liệt kê cả Payment của đơn.
- Ghi nhận, không sửa ở PR này: Android cũ crash NaN khi thêm vào giỏ sản phẩm có `salePrice = null` (có sẵn, không do BLOCK). Cần kiểm trên dữ liệu production.

## Mong muốn
Một PR hạ tầng nhỏ, additive, lên `main-real` trước mọi tính năng mới, không đổi hành vi nhìn thấy với client hôm nay (trừ việc iOS cũ mở được đơn có Payment, là bản sửa lỗi).

## Ràng buộc
Chỉ thêm field. Không migration. Không đụng production. Header `X-Client-Capabilities` chưa có token nào được web gửi.
