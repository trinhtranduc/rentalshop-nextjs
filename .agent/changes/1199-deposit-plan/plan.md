# Plan — Thu cọc theo giai đoạn

Issue: #<số> · Status: draft · Spec: ./spec.md · Nhánh từ `origin/dev`, PR vào `dev`.

Thứ tự công việc đã chốt: **PR0 hạ tầng → giá theo khối ngày (`../drafts-block-pricing/plan.md`) → thu cọc theo giai đoạn** (bật trên web ở cuối, cờ tắt mặc định). Ước lượng ngày công dưới đây là **thô**: PR0 ~5-7, khối ngày ~20, thu cọc ~35-40.

## Bước 0 (đã có kết quả, chạy lại bằng app thật trong PR0)
Script Swift đã chứng minh: struct `Payment` của iOS `release-2026-10-12.2` bắt buộc `paymentMethod`/`paymentDate`, API trả `method`/`processedAt` → `keyNotFound paymentMethod` tại `payments[0]` (impact-clients mục 5). Android cũ dung nạp. Việc còn lại: xác nhận bằng build iOS `main-real` thật trên Simulator (một đơn có 1 `Payment`), ghi vào issue. Chỉ đọc production, không chạm production.

## Thứ tự PR
| # | PR | Nội dung | Ước lượng thô |
|---|---|---|---|
| 0 | Mockup duyệt + chốt "Chưa chốt" | | chờ chủ shop |
| PR0 | `fix(api): old-client protection infra` (hạ tầng, **lên `main-real` trước**) | (1) alias `paymentMethod`/`paymentDate` (= `processedAt ?? createdAt`) trong `payments[]` mọi client; (2) cơ chế `X-Client-Capabilities`: hàm đọc header (không header = client cũ), CORS cho web, web gửi header; (3) bỏ dòng `notes='INSTALLMENT'` khỏi `payments[]`, `totalPaid`, `paymentCount` cho client không khai báo `installments` (lọc `status: COMPLETED` ở 3 chỗ `order.ts:1656-1663`, `[orderId]/route.ts:1003`); (4) `GET /api/payments` (admin) lọc theo `type`, không trả `ORDER_PAYMENT`; (5) giữ option BLOCK khi sản phẩm được lưu mà payload không có `pricingSchemaVersion`; (6) test hợp đồng: không header = hành vi hôm nay; fixture decode iOS có `payments` thật; LOG.md; `api-compat-review`; verify iOS `release-2026-10-12.2` trên dev-api rồi mới promote | 5-7 ngày |
| 1 | `refactor(api): revenue mapper consolidation` | gom ~13 ánh xạ về `toRevenueOrderData()`, ≥5 WHERE về `buildEventWhere()`, ba hàm (`byStatus`, `ForDate`, `Future`) qua mapper chung; **không đổi hành vi**, golden `tests/api-compat/*income*` đúng từng byte ở hai TZ | 4 ngày |
| 2 | `feat(api): deposit plan core` | test đỏ trước; `packages/utils/deposit-plan.ts` (`effectivePlan`); migration additive (`depositPlan`, `cancelKeptAmount`, `cancelledAt`, `Payment.installmentKey`, `Merchant.settings`, unique một phần bằng SQL thô, index `Payment(status, processedAt)`); settings API (`depositMode`, mẫu, chính sách; chỉ MERCHANT); tạo đơn kèm kế hoạch trong `afterInsert`; collect (khoá hàng + unique); `recomputeDepositFromPayments` ở 8 đường ghi `depositAmount`; chặn giao hàng P3 + mã lỗi + 5 locale `errors.json`; huỷ giữ/hoàn P4; quyền vai trò; audit; LOG.md | 10-12 ngày |
| 3 | `feat(api): installment reminders and revenue` | `RENT_INSTALLMENT`, `futureInstallments`, nhóm nguồn tiền, huỷ theo hoàn; outlet-operations; danh sách đơn; golden doanh thu mới | 5 ngày |
| 4 | `feat(client): deposit plan on web` | payload đăng nhập có `depositMode`; Cài đặt (bật cuối), tạo đơn, chi tiết (thu, tiến độ), giao hàng thu nốt, huỷ đơn, Tổng quan/nhắc | 6 ngày |
| 5 | `feat(mobile): deposit plan iOS` | model optional, cài đặt, giỏ/tạo đơn, chi tiết, giao, huỷ, Tổng quan | 7 ngày |
| 6 | `feat(mobile): deposit plan Android` | theo iOS | 7 ngày |
| 7 | `chore(i18n)` | key theo từng PR, rà 5 locale + `locales-valid-json` | 1 ngày |
| 8 | Verify + e2e hiển thị + app cũ | xem mục E2E | 3 ngày |
Tổng ~35-40 ngày (thô). PR 4, 5, 6 song song sau PR 2-3 lên dev. "Giữ lịch bắt buộc" nếu chủ shop chọn "có" thêm ~3 ngày (availability).

## Steps trong PR 2 (TDD)
1. Test golden + API đỏ (gồm đua hai request, replay `createOnce`, PUT/revert từ app cũ, P3, P4).
2. `effectivePlan` và `recomputeDepositFromPayments`, rồi migration (`db-migration`: `yarn db:migrate:dev --name order_deposit_plan`, đọc SQL, thêm unique một phần bằng SQL thủ công, kiểm drift, `yarn db:generate && yarn type-check`).
3. Route theo `api-route-standard`; id ngoài là `publicId`.
4. Nối 8 đường ghi `depositAmount` (xem spec); không có `if (mode===...)` trong logic tiền.
5. `yarn lint`, `yarn type-check`, `cd tests && yarn test deposit-plan` (hai TZ), `SKIP_ENV_VALIDATION=true yarn build`.

## Files chính
`prisma/schema.prisma` + migration, `packages/utils/src/core/{deposit-plan,revenue-calculator}.ts`, `packages/validation` (schema `depositPlan`), `packages/database/src/{order,payment,outlet-operations}.ts`, `apps/api/app/api/{orders,payments,settings/merchant,analytics/*}/**`, `apps/api/lib/{order-balance,order-balance-batch,order-deposits,mobile-app-config}.ts`, web `apps/client/app/{settings,orders,dashboard}/**`, iOS `Model/Order.swift`, `OrderDetailLogic.swift`, `Cart.swift`, Android `OrderDetailLogic.kt`, `Models.kt`, `ApiClient.kt`.

## E2E (hiển thị; phần UI chạy visible)
UI: Chrome headed bước chậm; `open -a Simulator` với thiết bị ở phía trước; Android AVD có cửa sổ (không `-no-window`). Chỉ API (`scripts/e2e/business-e2e.sh`, Jest): chạy nền, báo số. Tham chiếu hiện trạng app cũ: `e2e-old-app-baseline.md` (do việc khác tạo, không chờ). Dùng skill `mobile-e2e-local`; email seed đổi theo lần seed, đọc từ DB trước.
1. MERCHANT đặt "Thu cọc theo giai đoạn" (thấy cảnh báo app cũ).
2. Tạo đơn mẫu 30% / 40% / còn lại, thu giai đoạn 1.
3. Mở đơn bằng iOS và Android build `main-real` cũ: "Thu khi giao" đúng, đơn mở được.
4. Thu giai đoạn 2; kiểm `depositAmount`.
5. Giao từ app cũ khi còn giai đoạn chưa thu → bị chặn có thông báo tiếng Việt; thu đủ rồi giao.
6. Giao (thu `rest`) → trả.
7. Huỷ với số giữ (Payment hoàn, `cancelKeptAmount`); huỷ từ app cũ → hoàn toàn bộ + audit.
8. `income`/`overview` từng ngày VN gồm `futureInstallments`; `tests/api-compat/*income*` xanh dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
9. Tiệm chế độ 1 không đổi; nhân viên chỉ xem kế hoạch, không sửa/hoàn.

## Risks
- iOS cũ không giải mã `payments[]` (đã kiểm chứng bằng script): PR0 phải lên `main-real` trước mọi thứ khác.
- Tính trùng tiền giữa `depositAmount` và Payment PICKUP: một hàm `recomputeDepositFromPayments`, 8 đường ghi.
- Doanh thu theo ngày đổi cho đơn có kế hoạch; sót một trong ~13 ánh xạ làm hai màn hình lệch: PR gom mapper đi trước.
- Đua thu trùng: khoá hàng + unique một phần (migration có SQL thủ công, đo thời gian `CREATE INDEX` trên dữ liệu dev).
- Chặn giao hàng từ app cũ: Android cũ ưu tiên `error` (để rỗng), iOS hiện `message` thô — kiểm bằng e2e app cũ.
- Hoàn tiền/huỷ liên quan pháp lý (Điều 418 BLDS): chỉ hiện văn bản của tiệm.
- `MOBILE_FEATURES` trống = bật tất cả (đặt tường minh trước release).
- Staff giới hạn mới phải do API từ chối (hiện staff sửa `depositAmount`/refund tự do).
- Tiệm bật chế độ 2 trong khi nhân viên còn app cũ: đơn lẫn hai kiểu (P7).

## Rollback
Tắt khoá `installments` và đặt `depositMode` về "Thu cọc 1 lần": đơn mới quay về một khoản cọc, đơn đã có kế hoạch vẫn xem/thu được. Cột mới nullable nên giữ nguyên. Revert PR code; không revert migration.
