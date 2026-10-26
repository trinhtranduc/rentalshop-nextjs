# Spec — Thu cọc theo giai đoạn ("Cách thu cọc")

Issue: #<số> · Status: draft (thiết kế đã được chủ shop duyệt 2026-10-25) · Intent: ./intent.md · Mockup: scratchpad/mc2parts.html (phần 2) · Đánh giá tác động: ./impact-server.md, ./impact-clients.md

## Quyết định đã chốt
1. **Lưu trữ:** không thêm bảng mới cho giai đoạn thu hay mẫu. Đơn có một cột JSON nullable `Order.depositPlan` (có `v`, kiểm bằng zod). Tiền thu thật là các dòng `Payment` (`notes='INSTALLMENT'` + cột mới nullable `installmentKey`); unique một phần `(orderId, installmentKey)` chống thu trùng. Mẫu của tiệm nằm trong JSON cài đặt tiệm (`Merchant.settings.payment.templates`).
2. **`Order.depositAmount` vẫn là một con số** = tổng đã thu trước khi giao (app cũ đọc nguyên nghĩa). `depositPlan = null` là đơn cũ / chế độ "Thu cọc 1 lần" = hành vi hôm nay. Mọi logic tiền đi qua **một** hàm `effectivePlan(order, shop)`; không có `if (mode === ...)` trong logic tiền, để sau này gộp hai chế độ chỉ cần xoá chỗ chọn.
3. **Cài đặt "Cách thu cọc"** (chỉ MERCHANT đổi; mặc định mọi tiệm hiện có = "Thu cọc 1 lần"):
   - **"Thu cọc 1 lần"** (chế độ 1): một khoản cọc = Σ "Cọc mỗi món" × số lượng lúc đặt, phần còn lại thu khi lấy hàng. Đúng như hôm nay.
   - **"Thu cọc theo giai đoạn"** (chế độ 2): nhiều giai đoạn, mỗi giai đoạn = một **% tổng tiền đơn** với hạn riêng; giai đoạn cuối luôn là **phần còn lại tự tính**, thu khi lấy hàng. Sửa số tiền/hạn từng đơn: chỉ MERCHANT, các giai đoạn sau tự tính lại; nhân viên chỉ xem.
   - Ở chế độ 2 ô "Cọc mỗi món" của sản phẩm không dùng để tính cọc (kế hoạch thắng), không có dòng gợi ý. Loại số tiền `FIXED` và `BY_PRODUCT` **không** nằm trong MVP nhưng JSON cho phép thêm sau mà không đổi schema.
   - Thế chân (`securityDeposit`) tách riêng, không đổi.
   - Cờ phải có trong payload đăng nhập hoặc được tải khi thiếu (bài học #1138). Màn bật chế độ 2 hiện cảnh báo: nhân viên dùng app cũ vẫn thu cọc theo sản phẩm.
4. **Doanh thu:** mỗi giai đoạn có `Payment` tính vào **ngày thu thật** (ngày dân sự Việt Nam); phần không có `Payment` tính tại ngày lấy hàng (quy ước hiện tại); huỷ: hoàn = đã thu − giữ lại; thêm khoá mới `futureInstallments` (không đổi nghĩa `futureIncome`); gom ~13 chỗ ánh xạ đơn → doanh thu về máy tính doanh thu chung là bước tiên quyết; sự kiện theo `Payment` chỉ cho đơn có kế hoạch. Ví dụ tính tay đã sửa ở mục "Doanh thu".
5. **Bảo vệ app cũ (bắt buộc, PR0 "hạ tầng" lên `main-real` trước):** alias `paymentMethod`/`paymentDate`; cơ chế `X-Client-Capabilities`; ẩn dòng INSTALLMENT khỏi `payments[]` và `totalPaid` cho client cũ; lọc `/api/payments` của admin; giữ option BLOCK khi app cũ lưu sản phẩm. Máy chủ là nguồn quyết định: app cũ giao hàng khi còn giai đoạn chưa thu → **chặn** với lỗi rõ; app cũ huỷ đơn (không có số giữ) → hoàn toàn bộ + audit.
6. **Thứ tự làm:** PR0 hạ tầng → giá theo khối ngày → thu cọc theo giai đoạn (bật trên web ở cuối, cờ tắt mặc định). Ước lượng thô: PR0 ~5-7 ngày, khối ngày ~20, thu cọc ~35-40.
7. **Ngoài MVP, ghi là điểm mở rộng:** giới hạn thu của nhân viên, biên nhận từng đợt, loại FIXED/BY_PRODUCT, nhắc tự động (xem "Điểm mở rộng").

## Chưa chốt
1. Giá thuê quá mốc cuối của khối ngày (thuộc spec khối ngày, ảnh hưởng tổng tiền đơn nên ghi lại ở đây).
2. Nội dung mẫu mặc định (ví dụ 30% / 40% / còn lại; hạn từng giai đoạn).
3. Phải thu giai đoạn 1 mới giữ lịch? (đụng availability, thêm PR nếu "có").
4. Chính sách huỷ mặc định (văn bản) và mặc định giữ/hoàn trên màn Huỷ đơn.
5. Dùng lại #1189 cho khối ngày (xem spec khối ngày); các ước lượng ngày công ở trên chỉ là thô.
6. Nền tính % khi có điểm thưởng: đề xuất `totalAmount` như app cũ, tạm cấm dùng điểm khi đơn có kế hoạch.
7. Đơn thu nhầm một giai đoạn (không huỷ đơn): chưa vào MVP, đề xuất MERCHANT chuyển `Payment` sang `CANCELLED` có audit (giải phóng slot unique).

## Quyết định thiết kế chính (tương thích)
- `depositAmount` = **tổng đã thu trước khi giao** (app cũ dùng đúng nghĩa: `OrderDetailLogic.swift:203-237`, `OrderDetailLogic.kt:109-181`; "Thu khi giao" = tổng − `depositAmount` − Payment PICKUP). Với đơn có `depositPlan`, máy chủ giữ `depositAmount` = Σ `Payment` INSTALLMENT COMPLETED có thời điểm thu trước lúc lấy hàng (hoặc chưa lấy), trừ hoàn. Cùng một đại lượng, cập nhật nhiều lần.
- Giai đoạn cuối ("phần còn lại") thu khi lấy hàng đi đường cũ: app cũ ghi `Payment.notes='PICKUP'`, app mới ghi `INSTALLMENT` với `installmentKey='rest'`. Không bao giờ để một khoản vừa trong `depositAmount` vừa trong PICKUP.
- Trường mới (chỉ thêm): `depositPlan` (đã chuẩn hoá), `installments[]` (kết quả `effectivePlan`: key, nhãn, số tiền, hạn, trạng thái, đã thu), `installmentSummary{ planned, collected, remaining, percentCollected, nextDue }`, `cancelKeptAmount`, `cancelledAt`.
- App cũ gửi `depositAmount` khi sửa đơn: đơn có `depositPlan` thì bỏ qua giá trị đó (trả kèm số đúng); đơn không có kế hoạch như cũ. Không trả lỗi mới cho client không khai báo hỗ trợ, trừ trường hợp chặn giao hàng (mục "Bảo vệ app cũ").

## Dữ liệu `depositPlan` và `effectivePlan`
```json
{ "v": 1,
  "policy": "Huỷ không hoàn cọc giữ mẫu…",
  "items": [
    { "key": "i1", "label": "Cọc giữ mẫu", "type": "PERCENT", "value": 30, "dueRule": { "kind": "ON_CREATE" } },
    { "key": "i2", "label": "Cọc lần 2",   "type": "PERCENT", "value": 40, "dueRule": { "kind": "BEFORE_PICKUP", "days": 3 } }
  ] }
```
- `items` chỉ chứa các giai đoạn tường minh (1-3 giai đoạn). **Giai đoạn cuối "Còn lại khi nhận" không lưu**: `effectivePlan` luôn thêm `{key:'rest'}` = tổng − Σ các giai đoạn, hạn = ngày lấy hàng. Nhờ vậy tổng luôn khít và không có `INSTALLMENT_SUM_MISMATCH`.
- Hạn: `dueRule` (`ON_CREATE` | `BEFORE_PICKUP{days}` | `AFTER_CREATE{days}`) hoặc `dueDateKey` (`YYYY-MM-DD`) khi MERCHANT chọn ngày cụ thể. Tính bằng số học khoá ngày VN từ `pickupPlanAt` qua `getLocalDateKey`, không dùng `Date` nửa đêm.
- Sửa số tiền một giai đoạn (MERCHANT): thêm `amountOverride` (đồng, theo đơn vị nhỏ nhất của tiền tệ) cho giai đoạn đó; các giai đoạn sau và `rest` tự tính lại. Giai đoạn đã có `Payment` bị khoá: số tiền lấy từ `Payment`.
- Mở rộng sau (không đổi schema): `type: 'FIXED'` (`value` là số tiền), `type: 'BY_PRODUCT'` (= Σ cọc mỗi món × SL). `v` tăng khi đổi nghĩa trường. Zod là discriminated union theo `type`; MVP chỉ chấp nhận `PERCENT`, gặp `type` lạ thì từ chối khi ghi nhưng không làm hỏng khi đọc.
- `effectivePlan(order, shop)` trả danh sách giai đoạn đã giải: `{ key, label, amount, dueDateKey, collectedAmount, collectedAt, status }`.
  - `depositPlan` null: trả hai giai đoạn "tương đương hôm nay": `deposit` (= `depositAmount`, hạn = ngày tạo) và `rest` (hạn = ngày lấy hàng). Đơn cũ và chế độ 1 đi chung đường này.
  - `depositPlan` có giá trị: giải % → đồng (làm tròn theo đơn vị nhỏ nhất của tiền tệ: VND 1, USD 0,01), ghép với `Payment` theo `installmentKey`.
  - Mọi nơi tính tiền (số còn phải thu, QR, doanh thu, nhắc, kiểm quyền giao hàng) gọi hàm này, không đọc `depositPlan` trực tiếp, không rẽ nhánh theo chế độ.
- `shop` cung cấp mẫu mặc định, đơn vị tiền, múi giờ; chế độ của tiệm chỉ quyết định **đơn mới có sinh `depositPlan` hay không**, không nằm trong logic tiền. Đổi chế độ chỉ ảnh hưởng đơn tạo sau; đơn đã có kế hoạch giữ nguyên; quay về chế độ 1 không xoá kế hoạch của đơn cũ.

## Behavior
1. Mẫu của tiệm (`Merchant.settings.payment.templates`, tối đa 10): tên, 1-3 giai đoạn `{label, type:'PERCENT', value, dueRule}`, một mẫu mặc định. Mẫu gợi ý (tạo khi bấm "Dùng mẫu gợi ý", không seed bằng migration): "2 giai đoạn" (50% ngay), "3 giai đoạn" (30% / 40% / còn lại). Nội dung mẫu mặc định: chưa chốt.
2. Tiệm ở chế độ 1: không thấy gì mới; đơn tạo như cũ. `POST /api/orders` có `paymentPlan` khi tiệm ở chế độ 1 → **200, kế hoạch bị bỏ qua**, đơn tạo như cũ (`depositPlan = null`, `hasDepositPlan = false`); không có mã lỗi `INSTALLMENT_MODE_DISABLED`. Lý do (chủ chốt 2026-10-26, #1215): app còn nhớ chế độ cũ (cache) vẫn đặt được đơn, không bị chặn; code `planForNewOrder` (`apps/api/lib/installments.ts:76`) đã làm vậy từ đầu. Với client có `installments`, response vẫn có `installments[]` hai dòng `deposit` / `rest` do `effectivePlan` suy ra từ `depositAmount` (đúng dòng "depositPlan null" ở trên: đơn cũ và chế độ 1 đi chung một đường); client không có `installments` không nhận các trường này (`orders/route.ts:1400`).
3. Tạo đơn thuê (chế độ 2) chọn mẫu: máy chủ ghi `depositPlan` (chụp nhãn, %, chính sách), tính giai đoạn từ `totalAmount` đã chấp nhận (sau giảm giá, thứ tự: giá khối → giảm giá → điểm thưởng → kế hoạch). Tổng % > 100 hoặc `amountOverride` làm vượt tổng → 400 `INSTALLMENT_EXCEEDS_TOTAL`. Đơn SALE không dùng kế hoạch.
4. Sửa kế hoạch một đơn (MERCHANT): đổi nhãn, %, số tiền (`amountOverride`), hạn, thêm/xoá giai đoạn chưa thu. Giai đoạn đã thu khoá số tiền. Đổi tổng tiền (đổi áo/giá/ngày) thì giai đoạn chưa thu tính lại theo %, giai đoạn đã thu giữ số đã thu; tổng mới < đã thu → 409 `INSTALLMENT_OVERPAID`.
5. Trạng thái dẫn xuất theo khoá ngày VN: `PAID`, `PARTIAL`, `DUE_TODAY`, `OVERDUE`, `UPCOMING`, `VOID` (đơn huỷ).
6. Thu một giai đoạn: `POST /api/orders/[orderId]/installments/[key]/collect` `{amount, method, collectedOn?: 'YYYY-MM-DD', note?, reference}`: tạo `Payment` (ORDER_PAYMENT, COMPLETED, `notes='INSTALLMENT'`, `installmentKey`), idempotent theo `reference` (8-100 ký tự như `payments/process`), cập nhật `depositAmount` bằng `recomputeDepositFromPayments`. Thu thiếu → `PARTIAL`; thu thừa → 400 `INSTALLMENT_OVERPAID`. Thu hai lần cùng giai đoạn bị unique chặn (xem "Dữ liệu"). `collectedOn` lưu thành 12:00 giờ VN của ngày đó (tránh biên 17:00Z) và thêm khoá ngày vào `metadata`.
7. Tạo đơn kèm "thu giai đoạn 1 ngay" chạy trong `afterInsert` của `createOnce` (cùng transaction, đúng như `confirmBooking`): replay trong 60 giây hay lỗi giữa chừng không sinh `Payment` trùng hoặc đơn thiếu kế hoạch. `Payment` đợt 1 chỉ tạo sau khi bước điểm thưởng xong.
8. Thanh tiến độ: `percentCollected = collected / totalAmount` (ngoài thế chân).
9. Thế chân (`securityDeposit`, `collateral*`) tách riêng, không vào kế hoạch, không vào doanh thu thu nhập.
10. Chính sách huỷ: văn bản trong `Merchant.settings.payment.cancellationPolicy` (tối đa 1000 ký tự), chụp vào `depositPlan.policy` lúc tạo; in trên biên nhận đơn; hiện ở màn Huỷ đơn. Chính sách mặc định: chưa chốt.
11. Huỷ đơn có kế hoạch (cả `PUT /api/orders/[orderId]` và `PATCH …/status`): body tuỳ chọn `cancelKeptAmount` (0 ≤ giữ ≤ đã thu), `cancelNote`. Máy chủ tạo `Payment` REFUNDED `notes='CANCEL_REFUND'` = **đã thu − giữ**, ghi `cancelKeptAmount` và `cancelledAt`. Chỉ MERCHANT/OUTLET_ADMIN/ADMIN chọn số giữ; vai trò khác dùng mặc định. Không có `cancelKeptAmount` (app cũ) → hoàn toàn bộ và audit (xem "Bảo vệ app cũ"). Zod của route status phải nhận field mới (hiện cắt field lạ).
12. Dời ngày/đổi mẫu: ghi audit kèm chính sách; hạn `BEFORE_PICKUP` tính lại theo ngày lấy mới; không tự hoàn tiền.
13. Giữ lịch: chưa chốt có bắt buộc thu giai đoạn 1 hay không. Nếu "có": đơn vẫn `RESERVED` nhưng không tính vào "đã giữ" (đụng `apps/api/lib/availability-calendar-days.ts`).
14. Nhắc nhân viên: `GET /api/analytics/outlet-operations` thêm `installmentsDue`, `installmentsOverdue`, `installmentsDueTomorrow` (mỗi dòng: orderId public, orderNumber, customer, nhãn, số tiền, còn lại, dueDateKey, lateDays) — tính bằng cách duyệt đơn RESERVED của outlet có `depositPlan` rồi gọi `effectivePlan`; danh sách đơn thêm `nextInstallmentDue`, `installmentRemaining`. Chỉ hiển thị, không gửi tin cho khách, không cron.
15. Doanh thu: xem mục "Doanh thu".
16. Quyền (API từ chối, UI chỉ ẩn): MERCHANT (và ADMIN) cài chế độ, mẫu, chính sách, sửa kế hoạch từng đơn, chọn số giữ/hoàn. OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY (`isStaffLikeRole` cho hai vai sau): tạo đơn theo mẫu mặc định, thu giai đoạn bằng tiền mặt/chuyển khoản **tối đa số còn lại của giai đoạn**, xem tiến độ; không sửa kế hoạch, không hoàn. Giới hạn thu riêng của nhân viên: ngoài MVP.
17. Gia hạn #505: sau khi lấy hàng, kế hoạch so với `pickupTotalAmount`; phần gia hạn nằm ngoài kế hoạch (vào `RENT_RETURN` như cũ). `PUT totalAmount` của app cũ khi gia hạn không bị 400.

## Bảo vệ app cũ (máy chủ là nguồn quyết định)
| # | Tình huống (client không khai báo `installments`) | Hành vi đã chốt |
|---|---|---|
| P1 | `payments[]` của chi tiết đơn | thêm alias `paymentMethod`, `paymentDate` (= `processedAt ?? createdAt`, luôn có giá trị) cho mọi client; iOS cũ bắt buộc hai khoá này (đã kiểm chứng: `keyNotFound paymentMethod` tại `payments[0]`; Android cũ dung nạp) |
| P2 | `payments[]`, `totalPaid`, `paymentCount` | bỏ dòng INSTALLMENT khỏi `payments[]`, loại khỏi `totalPaid`/`paymentCount` cho client cũ (tránh "Đã thu" gấp đôi: `ProductsV2.swift:743-745`, `EditOrderSheet.kt:127`) |
| P3 | D1: giao hàng (`PUT`/`PATCH` status → `PICKUPED`) khi còn giai đoạn tường minh chưa thu | **chặn** 400, mã mới `INSTALLMENT_UNPAID_AT_PICKUP`, `message` tiếng Việt rõ ("Đơn còn giai đoạn cọc chưa thu. Vui lòng thu trên web hoặc cập nhật ứng dụng."), `error` rỗng (Android cũ ưu tiên `error`). Giai đoạn `rest` không chặn (thu khi giao như cũ). Áp dụng cho cả client mới: app mới thu các giai đoạn còn thiếu rồi mới đổi trạng thái |
| P4 | D2: huỷ đơn có kế hoạch không có `cancelKeptAmount` | hoàn toàn bộ số đã thu (Payment `CANCEL_REFUND`) và ghi audit "huỷ từ client cũ, chưa áp chính sách" |
| P5 | `PUT` có `depositAmount`/`totalAmount` | `depositAmount` bị bỏ qua (trả số đúng); `totalAmount` theo mục 17; không 400 |
| P6 | `payments/process` `PICKUP` của Android cũ | chấp nhận, tính vào giai đoạn `rest`; REFUND của STAFF chỉ bị chặn trên đơn có kế hoạch khi `notes` khác `RETURN_ADJUSTMENT` (Android cũ dùng REFUND để trả thế chân) |
| P7 | Tạo đơn bằng app cũ khi tiệm ở chế độ 2 | đơn không có `depositPlan` (cọc theo sản phẩm); không tự gán mẫu; ghi cờ trong audit và hiện số liệu "đơn tạo từ app cũ" để chủ shop biết |
| P8 | `revert` đơn | với đơn có kế hoạch: loại `depositAmount`, `totalAmount`, trạng thái huỷ khỏi phần khôi phục hoặc tính lại sau revert |
| P9 | Admin `GET /api/payments` | lọc theo `type` (không trả `ORDER_PAYMENT` đơn hàng vào bảng thanh toán gói) |
| P10 | Sản phẩm có option BLOCK được lưu bằng app cũ (không có `pricingSchemaVersion`) | giữ nguyên option BLOCK |

`X-Client-Capabilities` chưa tồn tại trong repo: PR0 thêm hàm đọc header (không header = client cũ), CORS cho phép header, web và app mới gửi. Tên khả năng: `installments`, `block-pricing`.

### `depositAmount` có 8 đường ghi (việc phải làm, mỗi đường gọi `recomputeDepositFromPayments(tx, orderId)` hoặc bỏ qua giá trị client khi đơn có kế hoạch)
1. `PUT /api/orders/[orderId]` — whitelist `packages/database/src/order.ts:499-508`, không có zod.
2. `POST /api/orders` — `resolveOrderDeposits`, `apps/api/app/api/orders/route.ts:892-896`.
3. `POST …/revert` — `orders/[orderId]/revert/route.ts:75-111`.
4. `PATCH …/status` — `pickedUpAt` do client gửi (`status/route.ts:153-170`) đổi phân loại "thu trước/sau giao"; phải validate và tính lại.
5. `POST /api/payments/process` (refund và thu) — `payments/process/route.ts`.
6. `merchants/[id]/orders` — `apps/api/app/api/merchants/[id]/orders/route.ts:173-216`.
7. `sync-standalone` — `apps/api/app/api/sync-standalone/route.ts:745`.
8. `admin/import-data` — `apps/api/app/api/admin/import-data/route.ts:618`.
Đường 6-8 chỉ tạo đơn không kế hoạch: ghi rõ không hỗ trợ `paymentPlan`.

## Out of scope
Cổng thanh toán, đối soát chuyển khoản, nhắn khách (Zalo/SMS/email), phí trễ, tự tính phạt huỷ theo mốc ngày, mốc thử áo, thu thế chân theo giai đoạn, và các mục ở "Điểm mở rộng".

## Điểm mở rộng (ngoài MVP, thiết kế đã chừa chỗ)
| Hạng mục | Cách thiết kế hỗ trợ sau này |
|---|---|
| Giới hạn thu của nhân viên | `effectivePlan` đã trả `remaining` từng giai đoạn; thêm kiểm quyền ở route collect, không đổi dữ liệu |
| Biên nhận từng giai đoạn | `Payment.id` + `installmentKey` đã đủ làm số biên nhận ổn định; chỉ thêm mẫu in |
| Loại `FIXED`, `BY_PRODUCT` | thêm giá trị `type` trong JSON (`v` giữ 1 hoặc tăng 2), `effectivePlan` thêm một nhánh giải số tiền |
| Nhắc tự động / báo khách | cần cron và bảng chỉ mục; dựng bảng tra cứu `(orderId, key, dueDateKey, outletId)` **backfill từ JSON** rồi mới thêm index; JSON vẫn là nguồn gốc |
| Nhiều giai đoạn hơn 3, gộp hai chế độ | xoá chỗ chọn chế độ ở bước tạo đơn, mẫu mặc định "1 lần" = một giai đoạn |

## API and data (migration additive, ví dụ `20261105000000_order_deposit_plan`)
```sql
ALTER TABLE "Order"   ADD COLUMN "depositPlan" JSONB;                  -- null = đơn cũ / chế độ 1
ALTER TABLE "Order"   ADD COLUMN "cancelKeptAmount" DOUBLE PRECISION;  -- tiền tiệm giữ khi huỷ
ALTER TABLE "Order"   ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "installmentKey" TEXT;                -- 'i1','i2','rest'
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "settings" JSONB;      -- chung với khối ngày; {payment:{v,depositMode,cancellationPolicy,templates}}
-- Raw SQL (Prisma không biểu diễn được unique một phần):
CREATE UNIQUE INDEX "Payment_orderId_installmentKey_completed_key"
  ON "Payment" ("orderId", "installmentKey")
  WHERE "installmentKey" IS NOT NULL AND "status" = 'COMPLETED';
CREATE INDEX "Payment_status_processedAt_idx" ON "Payment" ("status", "processedAt");
```
- Không bảng mới, không backfill: đơn cũ có `depositPlan = null` và đi đường cũ. Tất cả cột nullable; không đụng cột cũ.
- Lý do chỉ giữ hai cột huỷ: **giữ = Σ INSTALLMENT đã thu − Σ CANCEL_REFUND** nên không cần `cancelRefundedAmount`; chính sách chụp trong `depositPlan.policy` nên không cần `cancellationPolicy`; ghi chú huỷ vào audit. `cancelKeptAmount` và `cancelledAt` vẫn cần vì huỷ với hoàn = 0 không để lại `Payment` nào mang ngày huỷ, và `updatedAt` đổi mỗi khi sửa ghi chú (impact-server D4).
- Index một phần và `CREATE INDEX` thường khoá ghi bảng `Payment`: đo trên dữ liệu dev; theo `db-migration` viết SQL thủ công và kiểm `migrate dev` có báo drift. Không thêm unique `(orderId, reference)` toàn bảng (dữ liệu cũ có thể trùng).
- Unique chỉ tính dòng `COMPLETED`: dòng `REFUNDED`/`CANCELLED` giải phóng slot, nên thu lại sau khi chuyển dòng nhầm sang `CANCELLED` là hợp lệ.
- Chống đua: collect khoá hàng đơn (`SELECT … FOR UPDATE`) trong transaction; unique là lớp chặn cuối.

**Routes mới** (`with*Auth`, zod, `ResponseBuilder`, `handleApiError`, `db`): `GET/PUT /api/settings/merchant` thêm `depositMode`, `cancellationPolicy`, `templates` (PUT chỉ MERCHANT, như `PUT /api/settings/currency`); `PUT /api/orders/[orderId]/deposit-plan` (MERCHANT sửa kế hoạch); `POST /api/orders/[orderId]/installments/[key]/collect`. `POST /api/orders` nhận `paymentPlan?: { templateId?, items?, collectFirstNow?: {method, reference} }`. Mọi id ra ngoài là `publicId` số, không rò CUID; scope theo merchant/outlet người gọi. Field mới thêm vào whitelist `order.ts:499-508` và zod của route status.
**Response thêm:** chi tiết đơn `installments[]`, `installmentSummary`, `cancelKeptAmount`, `cancelledAt`, `depositPlanPolicy`; danh sách đơn `nextInstallmentDue`, `installmentRemaining`; payload đăng nhập/hồ sơ: `merchant.depositMode`.
**Hàm chung:** `packages/utils/src/core/deposit-plan.ts`: `parseDepositPlan`, `effectivePlan`, `applyTemplate`, `recalcAfterTotalChange`, `installmentStatus(dueDateKey, todayKey)`; test golden hai TZ. `packages/database`: `recomputeDepositFromPayments`.

## Screens (map mockup)
- Cài đặt (web `apps/client/app/settings/**`, iOS/Android): mục "Cách thu cọc" dạng danh sách chọn một: "Thu cọc 1 lần" / "Thu cọc theo giai đoạn"; chọn giai đoạn hiện cảnh báo app cũ, danh sách mẫu, ô chính sách huỷ. Chỉ MERCHANT sửa.
- Tạo đơn (web `apps/client/app/orders/create/`; giỏ iOS/Android): chế độ 2 hiện khối "Thu cọc theo giai đoạn" thay ô "Cọc": mẫu, từng giai đoạn (nhãn, %, số tiền, hạn; nhân viên chỉ xem), "Thu ngay giai đoạn 1".
- Chi tiết đơn: thẻ tiến độ, danh sách giai đoạn (đã thu + ngày/hình thức; chờ thu + hạn), "Thu giai đoạn N", Thế chân tách riêng, Huỷ đơn.
- Huỷ đơn: hiện chính sách, "Khách đã trả / Tiệm giữ lại / Hoàn cho khách" (MERCHANT sửa được số giữ).
- Giao hàng: thu nốt các giai đoạn còn thiếu trước khi đổi trạng thái (P3).
- Tổng quan: thẻ "Cần thu" và "Trễ hạn"; danh sách đơn: chip "Giai đoạn 2 trễ 2 ngày".
- iOS làm trước; Android theo iOS. Admin web để sau. Web bật mục cài đặt ở cuối (sau khi app mới có mặt).

## Timezone
Hạn là khoá ngày VN; "hôm nay" từ `formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE)`; ngày thu mặc định = ngày VN hôm nay; cấm `toISOString().split`, `setHours(0,0,0,0)`, `getDate()`. Mobile: iOS `shopTimeZone`, Android `ZoneId.of("Asia/Ho_Chi_Minh")`. Test 16:59:59Z / 17:00:00Z, hạn qua cuối tháng, thu lúc 00:30 giờ VN (`2026-11-12T17:30:00Z` thuộc 13/11), cùng ngày tạo-lấy. Mọi golden chạy `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.

## i18n keys (en, vi, ja, ko, zh)
`settings.json`: `depositModeTitle`, `depositModeOnce` ("Thu cọc 1 lần"), `depositModeStaged` ("Thu cọc theo giai đoạn"), `depositModeStagedWarning`, `depositTemplates`, `depositTemplateDefault`, `depositCreateTemplate`, `cancellationPolicy`, `cancellationPolicyHint`; `orders.json`: `installmentPlan`, `installmentLabel`, `installmentPercent`, `installmentAmount`, `installmentDue`, `installmentRest`, `installmentCollectNow`, `installmentCollected`, `installmentPending`, `installmentOverdue`, `installmentProgress`, `installmentCollect`, `securityDepositSeparate`, `cancelKept`, `cancelRefunded`, `cancelPolicyApplied`, `cancelConfirm`; `dashboard.json`: `installmentsToCollect`, `installmentsOverdue`, `staffReminderOnly`; `errors.json`: `INSTALLMENT_EXCEEDS_TOTAL`, `INSTALLMENT_OVERPAID`, `INSTALLMENT_ALREADY_PAID`, `INSTALLMENT_FORBIDDEN_ROLE`, `INSTALLMENT_UNPAID_AT_PICKUP`, `CANCEL_AMOUNTS_MISMATCH`. Mobile chỉ có en/vi. Sau khi gộp dev: `cd tests && npx jest locales-valid-json`. Câu `description` của `RENT_INSTALLMENT` là tiếng Việt cố định (app cũ ánh xạ chính xác câu cũ, câu lạ rơi về `description`).

## Doanh thu và báo cáo (rà soát lại 2026-10-25)

Hiện trạng (`packages/utils/src/core/revenue-calculator.ts`): "doanh thu" là **tiền thu trong ngày** theo sự kiện. RENT: cọc `depositAmount` tại ngày tạo (`RENT_DEPOSIT`, :196-209); lấy hàng = `pickupTotal − depositAmount + thế chân` (`RENT_PICKUP`, :221-237); trả = phí + gia hạn − thế chân (`RENT_RETURN`); huỷ = hoàn **toàn bộ** (`RENT_CANCELLED`, :273-304). Calculator **không đọc `Payment`**.

Vì sao không giữ nguyên công thức: khi máy chủ cập nhật `depositAmount` sau mỗi lần thu, công thức cũ dồn **mọi** giai đoạn thu trước khi giao vào **ngày tạo đơn**. Ví dụ bản nháp trước ("công thức cũ: 25/10 +2.000.000, 14/11 +12.000.000") **tự mâu thuẫn**: nó chỉ đúng khi `depositAmount` = 2.000.000, tức là khi `depositAmount` không phải tổng đã thu. Đã sửa ở ví dụ dưới.

**Quy tắc cho đơn có `depositPlan`** (đơn không có kế hoạch giữ nguyên công thức và golden):
1. Mỗi `Payment` INSTALLMENT COMPLETED = sự kiện `RENT_INSTALLMENT` tại **ngày thu thật** (`processedAt` đổi sang ngày VN). `RENT_DEPOSIT` không sinh.
2. Phần không có `Payment` (thường là giai đoạn `rest` thu khi giao): `RENT_PICKUP = pickupTotal − Σ Payment INSTALLMENT + thế chân` tại ngày lấy hàng (quy ước hiện tại; `Payment` `notes='PICKUP'` của app cũ không được đọc, nên rơi vào phần này). Nếu giai đoạn `rest` có `Payment` thì tính tại ngày của nó, không tính hai lần.
3. Thế chân, phí hư, phí trễ, gia hạn giữ như cũ; `RENT_RETURN` không đổi.
4. Huỷ: sự kiện âm = số hoàn (`Σ CANCEL_REFUND`) tại `processedAt` của dòng hoàn; phần giữ lại ở nguyên ngày đã thu (không phát sinh sự kiện mới) và được ghi `cancelKeptAmount` cùng `cancelledAt`. CANCELLED vẫn loại khỏi xếp hạng khách/sản phẩm.
5. Dự kiến: `futureIncome` **giữ nguyên nghĩa** (tiền thu tại ngày lấy hàng dự kiến; với đơn có kế hoạch chỉ gồm giai đoạn `rest`, vì Android cũ cộng nó vào doanh thu). Giai đoạn tường minh chưa thu đi vào **khoá mới `futureInstallments`** theo `dueDateKey`; giai đoạn quá hạn hiện ở "trễ hạn", không đẩy vào ngày quá khứ. App cũ không dùng `futureInstallments`, nên số dự kiến của đơn có kế hoạch trên app cũ thiếu phần giai đoạn tường minh, nhưng không cộng trùng.
6. Nhóm nguồn tiền (#492): `RENT_INSTALLMENT` thu trước khi lấy hàng vào `deposits`, thu tại hoặc sau lấy hàng vào `pickupAndSale`; `addToCollectedBreakdown` thêm `case` và `default` ném lỗi trong test, sao cho `deposits + pickupAndSale + fees − refunds` = tổng thu.
7. Máy chủ tính hết; app cũ nhận số đúng từ API. Tổng quan phía client (web `overview-model.ts`, iOS `OverviewDashLogic.swift`, Android `OverviewRelated.kt`) phải rà để hàng = thẻ.

**Bước tiên quyết (PR riêng, không đổi hành vi, golden không đổi từng byte):** gom ~13 chỗ ánh xạ đơn → doanh thu (`analytics/dashboard:202`, `enhanced-dashboard:179,196,213`, `growth-metrics:148`, `income/daily:279`, `income/orders:308`, `income/route.ts:238`, `system:177`, `today-metrics:95`, `top-customers:149`, `income-period-summary.ts:191`, `period-report.ts:446`) về `toRevenueOrderData()` và gom ≥5 mệnh đề WHERE về `buildEventWhere()`. Để chọn đơn có thu trong kỳ mà không cần lọc quan hệ (store giả `fake-order-store.ts` không hỗ trợ `payments: { some }`): truy vấn thứ hai `payment.findMany` theo `processedAt` trong cửa sổ ±1 ngày dân sự, rồi thêm `id in [...]` vào WHERE. Ba hàm riêng `getFutureRevenueEvents`, `getOrderRevenueForDate`, `calculateOrderRevenueByStatus` cũng đi qua mapper chung. Nhánh `payments` chỉ lọc `type = ORDER_PAYMENT AND orderId NOT NULL`.

### Ví dụ tính tay (đã sửa)
Đơn thuê 12.000.000, tạo 25/10, lấy 14/11, trả 17/11, thế chân 2.000.000 nhận 14/11 và trả 17/11, không phí. Số tiền theo đồng, ngày dân sự VN.

**Chế độ 2, mẫu 30% / 40% / còn lại:** giai đoạn 1 = 3.600.000 (hạn lúc tạo, thu 25/10); giai đoạn 2 = 4.800.000 (hạn 13/11, thu 13/11); `rest` = 3.600.000 (hạn 14/11, thu lúc giao, không ghi `Payment`). Khi xem báo cáo `depositAmount` = 8.400.000.

| Ngày | Chế độ 2 (quy tắc mới) | Chế độ 2 nếu **giữ công thức cũ** (sai) | Chế độ 1 (cọc theo sản phẩm 2.000.000) |
|---|---|---|---|
| 25/10 | +3.600.000 | +8.400.000 (cả `depositAmount`) | +2.000.000 |
| 13/11 | +4.800.000 | 0 | 0 |
| 14/11 | +3.600.000 (`rest`) +2.000.000 (thế chân) = **+5.600.000** | +3.600.000 + 2.000.000 = +5.600.000 | +10.000.000 + 2.000.000 = **+12.000.000** |
| 17/11 | −2.000.000 (thế chân) | −2.000.000 | −2.000.000 |
| Tổng ròng | 12.000.000 | 12.000.000 | 12.000.000 |

Không tính thế chân: chế độ 2 là 3.600.000 / 4.800.000 / 3.600.000 / 0; chế độ 1 là 2.000.000 / 0 / 10.000.000 / 0. Tổng luôn khít 12.000.000; chỉ **phân bố theo ngày** khác nhau. Giai đoạn 2 thu 13/11 hiện đúng 13/11 (công thức cũ dồn nó vào 25/10).

**Biến thể huỷ (chế độ 2):** huỷ 12/11 sau khi chỉ thu giai đoạn 1 (3.600.000 ngày 25/10); tiệm giữ 1.800.000, hoàn 1.800.000. Sự kiện: 25/10 +3.600.000; 12/11 −1.800.000; ròng +1.800.000 (tiền tiệm giữ). `cancelKeptAmount` = 1.800.000, `cancelledAt` = 12/11. Đơn huỷ không vào xếp hạng khách. Nếu huỷ từ app cũ (không có số giữ): 12/11 −3.600.000, ròng 0, kèm audit.

**Gia hạn #505:** sau khi lấy hàng (14/11), `pickupTotalAmount` = 12.000.000; gia hạn nâng `totalAmount` thành 12.600.000 ngày 15/11. Kế hoạch so với `pickupTotalAmount` nên không đổi; 600.000 vào `RENT_RETURN` ngày trả như cũ, không thêm giai đoạn.

Kiểm thử bắt buộc: golden đơn cũ không đổi (`tests/api-compat/*income*`, hai TZ); golden mới cho 2 giai đoạn, 3 giai đoạn, thu cùng ngày tạo/lấy, huỷ có giữ, huỷ từ app cũ, đổi tổng sau khi thu một giai đoạn, thế chân, gia hạn, thu 00:30 giờ VN; kiểm Tổng quan ba nền tảng khớp API; property test Σ nhóm nguồn = Σ sự kiện.

## Test plan
- Jest golden `tests/deposit-plan.test.ts` (2 TZ): `effectivePlan` 1/2/3 giai đoạn, làm tròn VND và USD, `rest` khít tổng, `amountOverride`, đổi tổng tiền, hạn `BEFORE_PICKUP` qua cuối tháng/17:00Z, trạng thái PAID/PARTIAL/DUE_TODAY/OVERDUE, JSON `type` lạ.
- API (`tests/api/`): tạo đơn với mẫu (chế độ 2) và bị từ chối ở chế độ 1; collect idempotent theo `reference`; **đua hai request** (unique chặn, một COMPLETED); thu thừa 400; `depositAmount` = Σ đã thu trước giao qua cả 8 đường ghi; replay `createOnce` đúng một bộ Payment; PUT/revert từ app cũ; `payments[]`/`totalPaid` không có INSTALLMENT cho client cũ, có alias; P3 chặn giao từ app cũ (message đúng, `error` rỗng) và cho `rest`; P4 huỷ app cũ hoàn toàn bộ + audit; huỷ có giữ; STAFF 403 sửa kế hoạch/hoàn, thu được; merchant khác 403; `payments/process` PICKUP trên đơn có kế hoạch; `/api/payments` không trả ORDER_PAYMENT; `outlet-operations`; `computeOrderBalance`/QR.
- Doanh thu: mở rộng `tests/revenue-calculator.test.js` (giữ case cũ + các kịch bản ở trên); bảng chéo: cùng một đơn qua cả ba hàm ra cùng tổng; mọi route doanh thu ra cùng số với fixture đơn có kế hoạch.
- Mobile unit: Swift/Kotlin golden `effectivePlan` và hiển thị trạng thái; fixture decode có `payments` thật (hiện fixture chỉ có `payments:[]`); JSON nháp giỏ cũ giải mã bởi bản mới.

## E2E (hiển thị cho chủ shop)
UI chạy hiển thị: Chrome headed bước chậm; `open -a Simulator` với thiết bị ở phía trước; Android AVD có cửa sổ (không `-no-window`). Chạy chỉ API (`scripts/e2e/business-e2e.sh`, Jest): chạy nền, chỉ báo số. Báo cáo nền hiện trạng app cũ sẽ nằm ở `e2e-old-app-baseline.md` (do việc khác tạo; tham chiếu, không chờ).
1. Đặt "Thu cọc theo giai đoạn" (chế độ 2) bằng tài khoản MERCHANT; thấy cảnh báo app cũ.
2. Tạo đơn với mẫu 30% / 40% / còn lại; giai đoạn 1 thu ngay.
3. Mở đơn bằng **iOS và Android build `main-real` cũ** (`release-2026-10-12.2`): đơn mở được, "Thu khi giao" đúng.
4. Thu giai đoạn 2 trên web/app mới; kiểm `depositAmount`.
5. Thử giao từ app cũ khi còn giai đoạn tường minh chưa thu: bị chặn, thấy thông báo tiếng Việt. Thu đủ rồi giao.
6. Giao hàng (thu `rest`) → trả hàng.
7. Một đơn khác: huỷ với số giữ → kiểm Payment hoàn, `cancelKeptAmount`; một đơn huỷ từ app cũ → hoàn toàn bộ + audit.
8. Kiểm `income`/`overview` theo từng ngày VN, gồm `futureInstallments`; `tests/api-compat/*income*` xanh dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
9. Tiệm chế độ 1 không đổi so với `main-real`; nhân viên chỉ xem kế hoạch, không sửa/hoàn.

## Rollout
- Cờ `MOBILE_FEATURES` khoá mới `installments`; chỉ ẩn/hiện UI app mới, không bảo vệ app cũ. Bật UI cần đồng thời khoá bật **và** `depositMode = STAGED`. Thứ tự: PR0 → khối ngày → API → iOS → Android → web bật cài đặt ở cuối, cờ tắt mặc định.
- **Checklist phát hành:** đặt `MOBILE_FEATURES` tường minh trên Railway production (để trống = bật tất cả khoá); PR0 đã ở `main-real` và iOS `release-2026-10-12.2` mở được đơn có Payment; golden đơn cũ không đổi; cờ `installments` tắt; ghi `.agent/api-changes/LOG.md` mỗi PR (chưa ghi ở bản nháp này); issue rủi ro khách cũ gắn vào PR `main-real`; `release-review` kiểm bằng build cũ.

## Acceptance
- [ ] Mỗi dòng Behavior và mỗi dòng bảng "Bảo vệ app cũ" có test hoặc kiểm tra trong plan.md
- [ ] iOS + Android; app `main-real` mở được đơn có kế hoạch; PR0 đã lên `main-real`
- [ ] 5 locale; CANCELLED, ngày VN, vai trò đúng
- [ ] Ví dụ doanh thu khớp golden; `tests/api-compat/*income*` xanh hai TZ
- [ ] Dòng LOG.md + bảng `## API compatibility` mỗi PR
