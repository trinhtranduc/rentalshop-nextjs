# Giá theo khối giờ (Theo khối giờ)

Issue: #1621 · Author: Trinh Tran (với Claude) · Status: accepted · Created: 2026-11-18

## Problem

Shop cho thuê đồ dùng vài giờ (váy cưới, vest, áo dài chụp ảnh) chỉ có ba cách tính giá: Theo lần, Theo ngày, Theo khối ngày (#1189). Họ không có giá "2 giờ 150.000, 4 giờ 250.000". Hiện họ phải dùng "Theo lần" rồi sửa giá tay ở mỗi đơn ("Giá cho đơn này"), dễ sai và không thấy được trên đơn là thuê mấy giờ.

## Proposed outcome

- Form sản phẩm có dòng "Theo khối giờ". Shop nhập các khối (số giờ 1–24 + giá), ví dụ 2 giờ 150.000 · 4 giờ 250.000 · 8 giờ 400.000.
- Ở giỏ, sheet "Cách tính giá" của món liệt kê từng khối như một lựa chọn. Chọn "Khối 4 giờ" thì giá dòng = 250.000 × số lượng, không nhân số ngày.
- Dòng đơn ghi "Khối 4 giờ · 250.000đ" ở chi tiết đơn, phiếu in, ảnh chia sẻ.
- Lịch thuê, số ngày, báo trùng lịch không đổi (vẫn theo ngày VN).
- App iOS/Android đang cài không bị tính sai tiền, không mất khối giờ khi lưu sản phẩm.

Kiểm được: các ca tiền ở `spec.md` (Váy 2/4/8 giờ, Vest 2 giờ × 2, đơn 3 ngày chọn khối 4 giờ = 250.000) có test.

## Affected users and systems

- Vai trò: `MERCHANT`, `OUTLET_ADMIN` cài giá (cần `products.manage`); `OUTLET_STAFF` chọn khối ở giỏ nhưng không sửa giá sản phẩm.
- Apps: `api`, `client` (web) trước; iOS rồi Android ở PR sau (thứ tự chủ chốt: web → iOS → Android).
- Dữ liệu: `ProductPricingOption` (cột đã có: `type HOURLY`, `unit HOUR`, `blockSize`), `OrderItem.pricingSnapshot` (đã có). Không migration.

## Constraints

- App đã cài (main-real) không cập nhật được: không thấy khối giờ ở sản phẩm, không xoá khối giờ khi lưu sản phẩm, mở/sửa đơn có dòng khối giờ vẫn đúng tiền.
- Không đổi nghĩa trường cũ; chỉ thêm (api-compat-review, LOG.md).
- Theo lần vẫn là giá mặc định bắt buộc; khối giờ không bao giờ là giá mặc định.
- Gói Basic chỉ dùng app: chỉ có tính năng khi bản iOS/Android ra.
- Đơn giản: không chọn giờ lấy/trả, không báo trùng theo giờ.

## Open questions

- (không còn) Mọi câu đã chốt ngày 2026-11-18, xem Decision log.

## Decision log

- 2026-11-18 — Tạm dừng bản đầy đủ (chọn giờ, trùng giờ); chỉ làm khối giờ ở sản phẩm (chủ shop: "chỉ đơn giản ở product cho chọn block giờ thôi").
- 2026-11-18 — Chốt mockup bản gọn (tab "Thuê theo giờ", https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 v285) (chủ shop: "chốt").
- 2026-11-18 — Đơn nhiều ngày chọn khối giờ: tính 1 lần như Theo lần (chủ shop chốt theo mockup).
- 2026-11-18 — Trùng lịch vẫn theo ngày; hai khách cùng ngày bị báo trùng, shop bấm "Vẫn tạo đơn" (chủ shop chốt theo mockup).
- 2026-11-18 — Thứ tự: web → iOS → Android (chủ shop).
- 2026-11-18 — Bắt đầu làm (chủ shop: "làm luôn").
