<!-- Tiêu đề (EN): feat: staged deposit collection for rental orders (shop setting "Cách thu cọc") -->
<!-- Template: .github/ISSUE_TEMPLATE/feature.yml · label: feature · Apps: api, client, ios, android, packages -->

## Problem
Đơn thuê chỉ có một khoản cọc (`Order.depositAmount`, thu lúc tạo đơn), một khoản thế chân (`securityDeposit`, `collateral*`) và bảng `Payment` không gắn giai đoạn (`prisma/schema.prisma` Order :390-450, Payment :489-521). Tiệm áo cưới thu theo nhịp: cọc giữ chỗ khi chốt mẫu (30-50% hoặc số cố định như 200.000đ), thu nốt khi nhận áo (docs/content/research/quy-trinh-thue-ao-cuoi.md, 16 tiệm). Không có chỗ ghi "giai đoạn nào, bao nhiêu, hạn nào, đã thu chưa", cũng không có nhắc "cần thu hôm nay / trễ".

## Outcome
- Cài đặt tiệm "Cách thu cọc" (chỉ MERCHANT đổi; mặc định mọi tiệm hiện có = "Thu cọc 1 lần", như hôm nay):
  - **Thu cọc 1 lần:** cọc = Σ "Cọc mỗi món" × số lượng, còn lại thu khi lấy hàng.
  - **Thu cọc theo giai đoạn:** mỗi giai đoạn = % tổng đơn với hạn riêng; giai đoạn cuối = phần còn lại thu khi lấy hàng; MERCHANT sửa số tiền/hạn từng đơn, nhân viên chỉ xem và thu.
- Lưu bằng một cột JSON `Order.depositPlan` (có `v`) + `Payment.installmentKey`; không thêm bảng. Mẫu của tiệm và chính sách huỷ nằm trong JSON cài đặt tiệm.
- Mọi logic tiền đi qua một hàm `effectivePlan(order, shop)`; không rẽ nhánh theo chế độ, để sau này gộp hai chế độ.
- Thanh tiến độ, thế chân tách riêng, huỷ ghi phần tiệm giữ/hoàn, nhắc nhân viên (chỉ hiển thị, không nhắn khách).
- Doanh thu: mỗi giai đoạn tính theo ngày thu thật (ngày VN); thêm `futureInstallments`; `futureIncome` giữ nghĩa cũ.
- App cũ không hỏng: PR0 "hạ tầng" lên `main-real` trước.
- Mockup: scratchpad/mc2parts.html phần 2. Chi tiết: `.agent/changes/<issue>-installments/{intent,spec,plan}.md`.

## Affected apps
api, client, ios, android, packages.

## Constraints
- Chỉ thêm. Không đổi nghĩa `depositAmount`, `totalAmount`, `securityDeposit`, `payments[].notes` (PICKUP / RETURN_ADJUSTMENT / SALE).
- Ngày hạn là ngày VN (`YYYY-MM-DD`). Doanh thu loại CANCELLED. `OUTLET_STAFF` có giới hạn. Không tự nhắn khách. Không đụng production, không áp migration.
- Giữ đơn giản (chủ shop: "đơn giản và chuẩn"). Ngoài MVP: giới hạn thu nhân viên, biên nhận từng giai đoạn, loại FIXED/BY_PRODUCT, nhắc tự động.

## Open questions (Chưa chốt)
1. Nội dung mẫu mặc định (ví dụ 30% / 40% / còn lại, hạn từng giai đoạn).
2. Phải thu giai đoạn 1 mới giữ lịch (đơn `RESERVED` giữ ngày) hay cho giữ 2-7 ngày chưa cọc?
3. Chính sách huỷ mặc định (ví dụ "huỷ không hoàn cọc giữ chỗ").
4. Khối ngày: quá mốc cuối "cộng thêm mỗi ngày" hay "giữ giá" (ảnh hưởng tổng tiền).
5. Dùng lại #1189 cho khối ngày; ước lượng ngày công chỉ là thô.
6. Nền tính % khi có điểm thưởng (đề xuất `totalAmount`, tạm cấm dùng điểm khi đơn có kế hoạch).

## API impact (installed apps)
So với `release-2026-10-12.2` (origin/main-real). Có đổi API: `POST/PUT /api/orders/[orderId]` (kế hoạch; `depositAmount` do server giữ), route mới thu giai đoạn và sửa kế hoạch, `GET /api/orders/[orderId]` (thêm `installments`), `GET /api/analytics/outlet-operations` (thêm danh sách), huỷ đơn (ghi giữ/hoàn), chặn giao hàng khi còn giai đoạn chưa thu (mã mới), `payments[]` (alias + lọc theo capability), `GET /api/payments` (admin lọc `type`), `Payment` ghi thêm, migration additive, `revenue-calculator.ts`.

| Khu vực | Thay đổi | iOS cũ | Android cũ | Web | Rủi ro |
|---|---|---|---|---|---|
| `depositAmount` | giữ nghĩa "tổng đã thu trước khi giao"; server cập nhật qua `recomputeDepositFromPayments` ở 8 đường ghi; đơn có kế hoạch thì bỏ qua `depositAmount` app cũ gửi | `OrderDetail.depositAmount: Double` bắt buộc `Order.swift:610`; `OrderDetailLogic.swift:203-237`; gửi `Cart.swift:878,988` | `Models.kt:105`, `ApiClient.kt:1508`; `OrderDetailLogic.kt:109-181`; gửi `ApiClient.kt:595,684` | đọc/ghi `depositAmount` | thấp: ý nghĩa giữ nguyên |
| `Payment` mới | mỗi lần thu = 1 `Payment` (COMPLETED, `notes='INSTALLMENT'`, `installmentKey`); không dùng `PICKUP` cho phần đã nằm trong `depositAmount` | balance chỉ cộng PICKUP/RETURN_ADJUSTMENT/SALE | `OrderDetailLogic.kt:109-181` | | thấp |
| `payments[]` chi tiết đơn | **iOS cũ bắt buộc `paymentMethod`, `paymentDate`; API trả `method`, `processedAt`**: thêm alias cho mọi client; bỏ dòng INSTALLMENT cho client không khai báo `installments` | `Order.swift:645,971-978` (đã kiểm chứng `keyNotFound` tại `payments[0]`) | tolerant `ApiClient.kt:1469,1492-1498` | | **cao nếu không có PR0**: iOS cũ không mở được đơn có Payment |
| `totalPaid`, `paymentCount` | loại INSTALLMENT cho client cũ | "Đã thu" = `deposit + totalPaid` gấp đôi `ProductsV2.swift:743-745` | `EditOrderSheet.kt:127` | | trung bình, có giảm thiểu |
| Giao hàng từ app cũ | còn giai đoạn tường minh chưa thu → 400 mã mới, `message` tiếng Việt, `error` rỗng; `rest` không chặn | `PUT status` `OrderHandOverSheetViewController.swift:39` | `HandOverReturnNoPaymentTest.kt:25` | | trung bình: app cũ chỉ hiện chữ; kiểm bằng e2e |
| Huỷ đơn | thêm `cancelKeptAmount`, `cancelNote` tuỳ chọn; không có (app cũ) → hoàn toàn bộ + audit | `OrderService.swift:615-619` | `OrdersScreens.kt:1528`, `OrderDetailV2Screen.kt:450` | | thấp |
| Doanh thu | đơn có kế hoạch: sự kiện theo ngày thu `Payment`; `futureIncome` giữ nghĩa, thêm `futureInstallments`; đơn cũ giữ công thức và golden | số từ server | Android cũ cộng `futureIncome` `OverviewScreen.kt:567`; `RENT_INSTALLMENT` rơi về `description` tiếng Việt | dashboard | trung bình: số theo ngày chỉ đổi cho đơn có kế hoạch |
| outlet-operations | thêm `installmentsDue`, `installmentsOverdue` | bỏ qua khoá lạ | bỏ qua | `api.ts:772` | thấp |
| `X-Client-Capabilities` | cơ chế mới (không header = client cũ) | không gửi | không gửi | gửi từ bản mới; CORS cho header | thấp |
| Admin `/api/payments` | lọc `type`, không trả `ORDER_PAYMENT` | | | admin | thấp |
| Quyền | thu/sửa theo vai trò; từ chối ở API | | | | thấp |

Verdict dự kiến: được, nếu (1) PR0 lên `main-real` trước và iOS cũ mở được đơn có Payment, (2) `depositAmount` luôn do server tính khi có kế hoạch, (3) không dùng notes `PICKUP` cho phần đã tính trong `depositAmount`, (4) `MOBILE_FEATURES` đặt tường minh, (5) golden đơn cũ không đổi. LOG.md: thêm khi chủ shop cho phép (bản nháp chưa ghi).
