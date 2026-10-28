# Đánh giá tác động hệ thống (phía SERVER): Thu theo tiến độ + Giá theo khối ngày

Trạng thái: bản rà soát chỉ đọc (không sửa code, không chạm production). Ngày rà: 2026-10-25.
Cơ sở code: `origin/dev` = `37b3d6f48`; app cũ đang chạy: `origin/main-real` = `4b892532e`.
Các file được trích dẫn trong tài liệu này (`revenue-calculator.ts`, `order-balance.ts`, `payments/process/route.ts`, `orders/route.ts`, `orders/[orderId]/route.ts`) **giống hệt** giữa `dev` và `main-real` (`git diff --stat` rỗng), nên số dòng dưới đây đúng cho cả hai nhánh; chỗ nào khác sẽ ghi riêng.
Nguồn spec: `drafts-installments/{spec,plan,issue}.md` (đọc hết, gồm "Quan hệ với Cọc mỗi món", "Cách thu cọc", "Doanh thu và báo cáo") và `drafts-block-pricing/spec.md` (chỉ phần chạm tiền).
Quy ước: đường dẫn `file:dòng` là trên `origin/dev`. "Chưa kiểm chứng" = đọc code nhưng chưa chạy/chưa có bằng chứng thực tế (xem mục 5).

---

## 1. Tóm tắt điều hành

### 1.1 Kết luận một đoạn

Thiết kế "giữ `depositAmount` = tổng đã thu trước khi giao" giữ được **các số tồn đọng** (còn phải thu, QR, "Thu khi giao") cho app cũ, vì mọi nơi đang tính `total - depositAmount`. Nhưng **doanh thu theo ngày thì sai ngay lập tức**: công thức hiện tại (`revenue-calculator.ts:196-209`) dồn toàn bộ `depositAmount` vào **ngày tạo đơn**. Khi server cập nhật `depositAmount` sau mỗi lần thu đợt, công thức cũ sẽ đẩy cả các đợt thu sau vào ngày tạo. Ví dụ trong spec ("công thức cũ: 25/10 +2.000.000, 14/11 +12.000.000") **không đúng** với chính thiết kế của spec: nếu `depositAmount` = 12.000.000 lúc xem báo cáo, công thức cũ cho 25/10 +12.000.000 và 14/11 +0 (xem kịch bản 3). Việc sửa doanh thu phải chạm **13 chỗ ánh xạ đơn thủ công** và **ít nhất 5 mệnh đề WHERE chọn đơn** (mục 3.1); sót một chỗ thì các màn hình lệch nhau mà không báo lỗi.

Phần còn lại của rủi ro nằm ở **hợp đồng với app cũ không thể cập nhật** (pickup không kiểm tiền, `payments/process` không giới hạn quyền, `PUT` ghi đè `depositAmount`/`totalAmount`, `revert` khôi phục `depositAmount`), ở **tính đồng thời** (không có ràng buộc duy nhất cho `Payment.reference`), và ở **hủy đơn** (ngày huỷ lấy từ `updatedAt`, xoá mềm đơn huỷ làm mất tiền giữ lại khỏi lịch sử).

### 1.2 Top 10 rủi ro (xếp hạng)

| # | Rủi ro | Mức | Quyết định cần chốt |
|---|---|---|---|
| 1 | **Doanh thu theo ngày lệch/không đồng nhất giữa các màn hình**: `getOrderRevenueEvents` chỉ nhận số vô hướng của đơn, không nhận `Payment`. 13 nơi tự ánh xạ đơn (liệt kê ở 3.1) và 5+ WHERE chọn đơn chỉ lọc `createdAt/pickedUpAt/returnedAt/CANCELLED.updatedAt`; một đợt thu hôm nay trên đơn tạo từ tháng trước **không được chọn** vào báo cáo hôm nay. | Cao | D1: chấp nhận gom về một hàm `toRevenueOrderData()` + một `buildEventWhere()` dùng chung, và thêm điều kiện `payments.some(processedAt trong kỳ)` ở mọi nơi? |
| 2 | **Giao hàng khi chưa ghi nhận thu / thu "PICKUP" không gắn với đợt**: route status không kiểm tiền (`status/route.ts:129-211`); app cũ thu phần còn lại bằng `Payment.notes='PICKUP'` (có cả tiền thế chân: `PaymentModels.kt:85-91`). Đợt còn lại của kế hoạch sẽ vẫn "chưa thu/trễ hạn" trong app mới dù khách đã trả đủ khi giao, và nhân viên có thể thu hai lần; doanh thu có thể thiếu hoặc trùng. | Cao | D2: khi giao hàng, server có tự phân bổ thanh toán `PICKUP` vào các đợt chưa thu (và coi phần còn lại là "thu lúc giao") không? Có cho giao khi còn nợ đợt không? |
| 3 | **`depositAmount` là đại lượng dẫn xuất nhưng có 8 đường ghi** ngoài collect: `PUT` (whitelist `order.ts:499-508`, không zod), `POST` tạo đơn (`route.ts:892-896`), `revert` (`revert/route.ts:75-111`), `pickedUpAt` do client gửi (`status/route.ts:156-158`), refund qua `payments/process`, `merchants/[id]/orders`, `sync-standalone`, `admin/import-data`. Lệch là âm thầm. | Cao | D3: một hàm `recomputeDepositFromPayments(tx, orderId)` gọi ở mọi đường ghi + từ chối/bỏ qua `depositAmount` của client với đơn có kế hoạch (spec đã nói, cần thêm `revert`) |
| 4 | **Huỷ đơn**: ngày huỷ = `updatedAt` (`revenue-calculator.ts:274`; sửa ghi chú sau huỷ làm sự kiện huỷ nhảy ngày); route status Zod `z.object` **bỏ mất** field lạ như `cancelKeptAmount`; app cũ huỷ không gửi body = hoàn hết (ledger `Payment` không có dòng REFUNDED nhưng doanh thu có sự kiện âm); xoá mềm đơn huỷ (`batch-delete`, `DELETE`) làm biến mất **tiền giữ lại** khỏi lịch sử (trước đây tổng ròng = 0 nên không thấy). | Cao | D4: thêm `Order.cancelledAt`; mặc định khi app cũ huỷ đơn có kế hoạch (hoàn hết như cũ, hay áp mặc định theo `nonRefundable`?); cấm xoá mềm đơn huỷ còn tiền giữ lại? |
| 5 | **Gia hạn #505 xung đột với "tổng các đợt = tổng tiền thuê"**: app cũ gia hạn bằng `PUT totalAmount` (`order.ts:666-669`, `revenue-calculator.ts:80-83`). Nếu kiểm tra `INSTALLMENT_SUM_MISMATCH` theo `totalAmount` ⇒ từ chối PUT của app cũ; nếu tự tính lại đợt chưa thu ⇒ tính trùng phần gia hạn (đã nằm trong `RENT_RETURN`). | Cao | D5: sau khi giao, kế hoạch so với `pickupTotalAmount`; phần gia hạn nằm ngoài kế hoạch (đề xuất) |
| 6 | **Đồng thời / idempotency**: `payments/process` kiểm trùng bằng `findFirst` rồi `create` (`process/route.ts:77-97`), schema **không có unique** trên `(orderId, reference)` (`schema.prisma` Payment chỉ có `@@index`). Hai nhân viên thu cùng một đợt / double-submit ⇒ hai dòng COMPLETED. Tạo đơn kèm kế hoạch phải nằm trong cùng transaction `createOrderOnce` (`afterInsert`, `order-create-guard.ts`), nếu không replay 60 giây sinh đợt trùng hoặc đơn không kế hoạch. | Cao | D6: khoá hàng đợt (`SELECT … FOR UPDATE`) + unique một phần `(installmentId, reference)` bằng SQL thô; chấp nhận migration có SQL thủ công? |
| 7 | **Quyền theo vai trò không thể thực thi bằng cách ẩn UI**: `payments/process` cho cả `OUTLET_STAFF`/`OUTLET_INVENTORY` hoàn tiền **bất kỳ số tiền** (`process/route.ts:35,91`), và app Android cũ **dùng** `REFUND` hợp lệ để trả thế chân (`PaymentModels.kt:107-113`). `PUT` cho staff sửa `depositAmount/totalAmount` tự do. Chặn REFUND tổng quát sẽ làm hỏng luồng trả hàng của app cũ. | Cao | D7: chỉ chặn trên **đơn có kế hoạch** và chỉ với `notes` khác `RETURN_ADJUSTMENT`; cần một liệt kê `notes` hợp lệ |
| 8 | **Khả năng tương thích payload**: iOS `main-real` khai báo `Payment{paymentMethod, paymentDate}` bắt buộc (`Order.swift:971-977`) trong khi API trả `method/processedAt`; `payments: [Payment]` không optional (`Order.swift:645` trên dev). Nếu đúng, **mọi đơn có ≥1 dòng Payment** đã không giải mã được trên iOS cũ ⇒ đơn có kế hoạch (nhiều Payment) mở lỗi. Header `X-Client-Capabilities` **chưa tồn tại ở đâu trong repo** (grep rỗng), và CORS cho web chưa kiểm. | Cao nếu xác nhận (chưa kiểm chứng) | Chạy "bước 0" của plan trước mọi code; D8: lọc `INSTALLMENT` khỏi `payments[]` theo header nào? |
| 9 | **Cơ sở tính kế hoạch không chắc chắn**: `totalAmount` do client gửi, server không tính lại (`orders/route.ts:909`); giảm điểm thưởng (`loyaltyDiscount`) áp **sau** khi tạo đơn (`order-hooks.ts:260-266`) và không nằm trong `totalAmount`; web trừ nó khỏi "Thu khi giao" (`create-model.ts:510-512`) còn server/`revenue-calculator` thì không. Giá khối ngày làm server tính lại `totalAmount` lần đầu tiên; `createGuard.totalAmount` (`orders/route.ts:948`) dùng số client nên chống trùng #341 sẽ hỏng cho đơn BLOCK từ app cũ. | Trung bình | D9: cơ sở kế hoạch = `totalAmount − loyaltyDiscount`? tạo đợt sau bước loyalty? guard dùng tổng đã lưu |
| 10 | **Làm tròn/tiền tệ/múi giờ**: "làm tròn đồng" sai với shop USD (#1145, `Merchant.currency` mặc định `USD`, chỉ hiển thị, không quy đổi); `Payment.currency` bị cứng `'VND'` (`process/route.ts:88`); `Float` cho tiền; `dueDateKey`/`collectedOn` cần quy ước instant. Thấp hơn về hậu quả nhưng dễ sai ở biên 00:30 VN (kịch bản 8). | Trung bình | D10: đơn vị nhỏ nhất theo tiền tệ shop (VND 1, USD 0,01); `collectedOn` lưu thế nào |

Các rủi ro còn lại (hiệu năng `take: 10000`, thiếu index `processedAt`, harness test không hỗ trợ quan hệ, `totalPaid` đếm cả REFUNDED, `MOBILE_FEATURES` để trống = bật hết) nằm trong bảng ở mục 2.

### 1.3 Quyết định cần chủ shop/chủ dự án chốt (tóm tắt)

D1 mô hình sự kiện doanh thu · D2 giao hàng khi còn nợ đợt · D3 một nguồn sự thật cho `depositAmount` · D4 `cancelledAt` và mặc định huỷ cho app cũ · D5 gia hạn ngoài kế hoạch · D6 khoá đồng thời bằng SQL thô · D7 phạm vi chặn REFUND/sửa theo vai trò · D8 lọc `payments[]` theo header hay theo ngưỡng phiên bản · D9 cơ sở kế hoạch với điểm thưởng · D10 tiền tệ và `collectedOn`. Thêm câu hỏi 7 trong spec ("STAFF thu tối đa bao nhiêu, có sửa hạn không") vẫn mở.

---

## 2. Bảng theo khu vực

Cột: Khu vực | Bằng chứng (file:dòng, dev; main-real chỗ app cũ liên quan) | Hiện tại | Điều gì hỏng/đổi khi có kế hoạch | Thay đổi cần làm | Rủi ro | Test cần có

### 2.A Tính toán doanh thu (lõi)

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| `getOrderRevenueEvents` | `packages/utils/src/core/revenue-calculator.ts:123-308` (giống main-real) | Sự kiện theo mốc: `RENT_DEPOSIT` = `depositAmount` tại `createdAt` (196-209); `RENT_PICKUP` = `pickupTotal − depositAmount + S` tại `pickedUpAt`, hoặc `pickupTotal + S` nếu tạo và giao cùng ngày VN (221-237); `RENT_RETURN` (244-271); `RENT_CANCELLED` (273-304). Không đọc `Payment`. | Với `depositAmount` được server cập nhật, cả các đợt thu sau đều rơi vào ngày tạo. Đợt thu cùng ngày giao bị bỏ qua (nhánh same-day lấy `pickupTotal` trọn vẹn). | Thêm `installmentPayments?: {amount, at}[]` vào `OrderRevenueData`; nếu có (đơn có kế hoạch) thì **thay** `RENT_DEPOSIT` bằng N sự kiện `RENT_INSTALLMENT` tại `processedAt`, `RENT_PICKUP = pickupTotal − Σ đã thu trước giao + S`. Đơn không có kế hoạch giữ nguyên từng dòng. | Cao | Mở rộng `tests/revenue-calculator.test.js`: giữ nguyên case cũ + 8 kịch bản mục 3 |
| `getFutureRevenueEvents`, `getOrderRevenueForDate`, `calculateOrderRevenueByStatus` | `revenue-calculator.ts:440-514` (dự kiến = `total − deposit` tại ngày giao dự kiến, 467); 584-673 (nhánh RETURNED trả `totalAmount+fees` cho **mọi** ngày sau, 616); 773-826 (theo trạng thái) | Ba hàm riêng, mỗi hàm tự lặp công thức. | Spec chỉ nói về "sự kiện"; hai hàm còn lại (dùng ở `analytics/dashboard`, `today-metrics`, `income/route.ts`) không được nhắc ⇒ ba nơi cho ba con số khác nhau. | Quyết định hàm nào được giữ (D1); với đơn có kế hoạch, `byStatus` = Σ thu thực + phần giao; `ForDate` nhánh RETURNED phải bỏ qua. Ghi vào spec. | Cao | Test bảng chéo: cùng một đơn cho 3 hàm ⇒ cùng tổng |
| `addToCollectedBreakdown` (#492) | `revenue-calculator.ts:326-351` — `switch` **không có `default`** | Chỉ biết `RENT_DEPOSIT/SALE/RENT_PICKUP/RENT_RETURN/*_CANCELLED`. | Loại sự kiện mới `RENT_INSTALLMENT` bị **bỏ im lặng** khỏi `deposits/pickupAndSale/fees/refunds` ⇒ `deposits + pickupAndSale + fees − refunds ≠ totalCollected`. | Thêm `case` (trước giao ⇒ `deposits`, sau giao ⇒ `pickupAndSale`) + `default` ném lỗi trong test. | Cao | Property test: Σ bucket = Σ sự kiện cho mọi kịch bản |
| `collateralByEvent` / `revenueEventKey` | `revenue-calculator.ts:381-396` (khoá = loại + thời điểm; chú thích "một đơn có tối đa một sự kiện mỗi loại tại một thời điểm") | Dùng cho `income/orders`, `series[].cashCollected`. | Hai đợt thu cùng mili-giây (thu 2 đợt một lúc) trùng khoá, bị cộng gộp. Không sai tổng nhưng dòng hiển thị gộp. | Thêm `seq` vào khoá hoặc loại sự kiện kèm `installmentId`. | Thấp | Test 2 đợt cùng thời điểm |
| `OrderRevenueData` mapper | 13 nơi: `analytics/dashboard/route.ts:202`, `enhanced-dashboard:179,196,213`, `growth-metrics:148`, `income/daily:279`, `income/orders:308`, `income/route.ts:238`, `system:177`, `today-metrics:95`, `top-customers:149`, `income-period-summary.ts:191`, `period-report.ts:446` | Mỗi nơi copy từng field. | Quên một nơi ⇒ công thức cũ cho đơn có kế hoạch ⇒ màn hình này khác màn hình kia (kịch bản 2). Không có test bắt được. | Một `toRevenueOrderData(order)` + `select` dùng chung; test quét import. | Cao | Test "mọi route doanh thu cho cùng số" trên fixture đơn có kế hoạch |
| Chọn đơn theo sự kiện (WHERE) | `income/daily:106-150`, `income-period-summary.ts:110-128`, `income/route.ts:161-179`, `period-report.ts` `buildEventWhere` (456), `growth-metrics:101-139`, `system:112-123` | `OR` của `createdAt/pickedUpAt/returnedAt/CANCELLED.updatedAt/SALE COMPLETED.updatedAt` (+ `pickupPlanAt/returnPlanAt` ở `income/route.ts`). `enhanced-dashboard` chỉ `createdAt` (đã thiếu từ trước). | Đợt thu hôm nay của đơn không có mốc nào trong kỳ **không được chọn** ⇒ thiếu doanh thu. | Thêm nhánh `{ payments: { some: { status in (COMPLETED, REFUNDED), processedAt: trong cửa sổ mở rộng ±1 ngày } } }` ở **mọi** nơi; `take: 10000` cần kiểm tra lại. | Cao | Test: đơn tạo tháng trước, thu đợt hôm nay ⇒ có trong ngày |
| Dự kiến (`totalRevenuePlan`) | `income/daily/route.ts:685-730` (dòng 705 `Math.max(0, total − deposit)` tính **ngoài** calculator); `period-report.ts:538-547,773-796` (`expectedAtHandOver`), `order-value.ts:13-29,48-78` (`outstanding`) | Dự kiến = phần còn lại tại **ngày giao dự kiến**. | Spec §15.4 nói dự kiến theo `dueDateKey` từng đợt, nhưng 3 hàm tính ngoài calculator sẽ không đổi theo ⇒ "dự kiến" và "outstanding" mâu thuẫn. Vì `depositAmount` được giữ đúng nên `outstanding` vẫn đúng tổng; chỉ **phân bố theo ngày** sai. | Nêu rõ: `futureIncome` giữ nghĩa cũ, thêm `futureInstallments`; sửa 3 hàm hoặc ghi chú không đổi. | Trung bình | Golden dự kiến 2 TZ |
| Top khách hàng / xếp hạng | `top-customers/route.ts:95-99` (loại CANCELLED), `period-report.ts:1042` | Xếp hạng dùng sự kiện không tính thế chân. | Đơn huỷ giữ lại 1.000.000 là tiền thu thật nhưng bị loại khỏi `totalSpent` khách (đúng spec) trong khi nằm trong "đã thu" ngày ⇒ khác nhau giữa hai báo cáo. Chấp nhận nhưng phải ghi. | Ghi vào spec: tiền giữ lại không vào xếp hạng. | Thấp | Test top-customers với đơn huỷ giữ lại |

### 2.B Đơn hàng: tạo / sửa / giao / trả / huỷ / khôi phục / xoá

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| `POST /api/orders` — tổng và cọc | `apps/api/app/api/orders/route.ts:892-896` (`resolveOrderDeposits`), 909 (`totalAmount: parsed.data.totalAmount`), 898-899 (clamp giảm giá) | Server tin `totalAmount`, `depositAmount` từ client. | Đơn có kế hoạch: `depositAmount` phải = Σ thu lúc tạo (`collectFirstNow`) chứ không phải số client; `totalAmount` client có thể ≠ Σ dòng − giảm giá. | Với `paymentPlan`: bỏ qua `depositAmount` client, tính đợt từ `totalAmount` đã chấp nhận, kiểm `INSTALLMENT_EXCEEDS_TOTAL`. | Trung bình | API: tạo với mẫu 2/3 đợt; app cũ gửi `depositAmount` bị bỏ qua |
| `POST` — idempotency #341 | `order-create-guard.ts` (khoá advisory theo outlet+khách+người tạo; khoá `Idempotency-Key`; cửa sổ 60 giây so `totalAmount`+món) ; `orders/route.ts:943-956,998-1035` | Replay trả đơn cũ, bỏ qua tác dụng phụ (`isReplay`). | Đợt và dòng `collectFirstNow` phải tạo trong `afterInsert` (cùng transaction, giống `confirmBooking` 977-992); làm sau bước tạo ⇒ replay có thể tạo đợt hai lần, hoặc lỗi giữa chừng để đơn không kế hoạch. | Dùng `options.afterInsert` cho đợt + Payment đợt 1. | Cao | Test replay cùng khoá: đúng một bộ đợt/Payment |
| `POST` — loyalty | `orders/route.ts:1037-1074` (redeem sau khi tạo; lỗi redeem **xoá cứng đơn** `db.orders.delete` 1058); `order-hooks.ts:102-109,260-266` | Redeem đặt `loyaltyDiscount` sau tạo; `totalAmount` không đổi. | Đợt tính theo `totalAmount` > số khách thực nợ (nếu trừ điểm); xoá cứng đơn kéo theo `OrderInstallment`+`Payment` (cả hai `ON DELETE CASCADE`) ⇒ mất cả tiền đã thu của đợt 1 trong cùng request. | D9: tạo đợt sau bước loyalty, hoặc tính sẵn `loyaltyDiscount` từ `loyaltyRedeem`; không tạo Payment đợt 1 trước khi loyalty xong. | Trung bình | Test redeem lỗi ⇒ không để lại Payment mồ côi/ghi nhận doanh thu |
| `POST` — gói đơn tối đa | `checkPlanLimitIfNeeded(user, merchantId, 'orders')` `route.ts:691` | Đếm **đơn**. | Đợt/Payment không phải đơn ⇒ không đổi hạn mức đơn. Xác nhận không chồng chéo. | Không làm gì. | Thấp | — |
| `PUT /api/orders/[orderId]` | `orders/[orderId]/route.ts:719` (`{...validUpdateData} = body`, **không zod**), 756-770, 868; whitelist `packages/database/src/order.ts:499-508` (có `depositAmount`, `totalAmount`, `securityDeposit`, `damageFee`, `lateFee`, `pickedUpAt`; **không** có `pickupTotalAmount`, `loyalty*`) | Mọi vai trò có `orders.update` (cả STAFF) sửa được các số tiền. | `depositAmount`/`totalAmount` từ app cũ ghi đè giá trị server giữ; field `cancelKeptAmount…` bị lọc mất vì không có trong whitelist. | Thêm field mới vào whitelist; với đơn có kế hoạch: bỏ qua `depositAmount`, xử lý `totalAmount` theo D5; zod cho field mới. | Cao | PUT từ app cũ với `depositAmount` khác ⇒ bỏ qua; PUT gia hạn ⇒ không 400 |
| `PATCH …/status` (giao/trả/huỷ) | `orders/[orderId]/status/route.ts:17-35` (zod `z.object`, mặc định **cắt field lạ**), 129 (`canChangeOrderStatus`), 153-170 (`pickedUpAt` client gửi `z.string()` không validate ngày), 211, 223-251 (loyalty), 256-273 (audit), 276-290 (push) ; main-real giống | Không kiểm tiền; iOS/Android gửi status qua `PUT` (chú thích `[orderId]/route.ts:627`). | Spec §11 viết "PUT / status": phải thêm field vào **cả hai** route, zod `.strict()` không dùng được (app cũ gửi lung tung); `pickedUpAt` lùi/tới đổi phân loại "thu trước/sau giao" ⇒ phải tính lại `depositAmount`; giao hàng khi còn nợ (D2). | Thêm `cancelKeptAmount/cancelRefundedAmount/cancelNote` vào schema status; tính lại `depositAmount` khi `pickedUpAt` đổi; validate `pickedUpAt`. | Cao | Cancel qua cả PUT và PATCH; `pickedUpAt` lùi ngày |
| `pickupTotalAmount` (#505) | `database/src/order.ts:417,666-669`; `revenue-calculator.ts:76-83` | Chụp `totalAmount` lúc giao; phần chênh = gia hạn trả khi trả. | Xem kịch bản 5 và rủi ro 5. Kế hoạch sau giao phải so `pickupTotalAmount`. | D5. | Cao | Kịch bản 5 |
| `POST …/revert` | `orders/[orderId]/revert/route.ts:75-111`; `SENSITIVE_KEYS` chỉ `password,token,secret,createdAt,updatedAt,id,orderNumber,orderItems` | Khôi phục mọi giá trị cũ từ log, gồm `depositAmount`, `totalAmount`, `status`, `pickedUpAt`. | Revert một bản ghi cũ ghi đè `depositAmount` dẫn xuất ⇒ lệch với Payment; revert trạng thái CANCELLED→RESERVED không đảo `cancelKept…` và các Payment `CANCEL_REFUND`. | Với đơn có kế hoạch: loại `depositAmount/totalAmount/status huỷ` khỏi revert hoặc tính lại sau revert. | Cao | Test revert sau thu đợt |
| `POST …/restore`, `DELETE`, `batch-delete` | `restore/route.ts:62-72`; `batch-delete/route.ts:44-48,84-97` (STAFF cấm; MERCHANT/OUTLET_ADMIN chỉ xoá CANCELLED; ADMIN xoá mọi trạng thái); `database/src/order.ts:1128` (`deletedAt`) | Mọi truy vấn doanh thu lọc `deletedAt: null`. | Xoá mềm đơn huỷ làm **tiền giữ lại biến khỏi lịch sử**; ADMIN xoá đơn đang có đợt đã thu ⇒ doanh thu quá khứ đổi. Khôi phục không nhắc Payment. | Chặn xoá khi tồn tại Payment COMPLETED/REFUNDED chưa cân (hoặc chỉ cho khi tổng ròng = 0); ghi audit. | Trung bình | Xoá đơn huỷ có giữ lại ⇒ 409 |
| `GET` chi tiết/list: `amountDue`, `totalPaid` | `[orderId]/route.ts:933` (`calculateAmountDue(total, loyaltyDiscount)`), 1003 (**cộng mọi trạng thái**); `orders/route.ts:1155,1201`; `database/src/order.ts:1656-1663` (groupBy **không lọc status**) vs 1950-1955, 2261 (lọc COMPLETED) | Hai nghĩa của `amountDue`: cũ (`total − loyalty`) ở POST/PUT; mới (`computeOrderBalance`) ở danh sách. `totalPaid` có chỗ cộng cả REFUNDED. | Dòng REFUNDED mới (`CANCEL_REFUND`, hoàn đợt) làm `totalPaid` **tăng** ở các đường không lọc ⇒ app cũ hiển thị "đã trả" sai. | Lọc `status: COMPLETED` ở 3 chỗ (đồng thời `totalPaid` ròng = COMPLETED − REFUNDED nếu đổi nghĩa thì thêm field mới). | Trung bình | Test `totalPaid` sau hoàn |
| Audit / lịch sử | `lib/change-timeline.ts:195-196,368-369,487-488,561-588`; `payments/process:99-118` (`safeAudit` ngoài transaction) | Audit "thu cọc" theo thay đổi `depositAmount`. | `depositAmount` giờ đổi bởi server mỗi lần collect ⇒ dòng "Thu cọc" trùng với dòng `ORDER_PAYMENT`; thiếu snapshot cho `cancelKept…`, đợt. Audit là best-effort ⇒ có thể mất dòng trong khi tiền đã ghi. | Thêm field vào snapshot; collect ghi audit trong cùng transaction hoặc chấp nhận best-effort và ghi rõ; chặn kiểu `kind` trùng. | Trung bình | Test lịch sử một lần collect = một dòng |
| Notifications / push | `lib/push-notifications.ts:14` (`OrderPushEventType` chỉ `ORDER_CREATED|ORDER_STATUS_CHANGED`); chú thích 461 "app cũ hiện hàng trung tính cho kiểu lạ" | Chỉ tạo/đổi trạng thái. | Spec §14 "không gửi tin" ⇒ không cần push mới. Huỷ vẫn push `ORDER_STATUS_CHANGED`. | Không thêm push v1 (giữ đơn giản). | Thấp | — |

### 2.C Thanh toán (`Payment`) và vai trò

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| `POST /api/payments/process` | `payments/process/route.ts:16-28` (zod: `orderId, amount>0, method, kind COLLECT|REFUND, reference 8-100, notes ≤500`), 35 (roles: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY), 77-82 (dedupe `findFirst`), 84-97, 88 (`currency: 'VND'`), 94 (`processedAt: new Date()`), 96 (`metadata source ANDROID_POS`) | Không kiểm trạng thái đơn, không giới hạn số tiền, không giới hạn vai trò theo `kind`. Trùng `reference` trả `ORDER_PAYMENT_ALREADY_PROCESSED` dù **số tiền khác**. | Hai request song song cùng `reference` đều vượt `findFirst` ⇒ 2 dòng; không có `installmentId`/`collectedOn`; STAFF hoàn không giới hạn; thu vào đơn đã huỷ/đã trả. | Route collect mới (spec) làm đúng; `process` giữ hợp đồng cũ (app cũ) nhưng với đơn có kế hoạch: gắn `installmentId` theo thứ tự, chặn quá hạn mức đợt, chặn REFUND ngoài `RETURN_ADJUSTMENT` cho vai trò staff (D7). | Cao | Race test 2 request; STAFF refund trên đơn có kế hoạch ⇒ 403; app cũ trả thế chân vẫn 201 |
| Ràng buộc DB | `prisma/schema.prisma` model Payment: chỉ `@@index([orderId,status])` … `[currency]`; **không** unique | — | Cần unique `(installmentId, reference)` **một phần** (`WHERE installmentId IS NOT NULL`); Prisma không biểu diễn được ⇒ SQL thô, dễ bị `migrate dev` báo drift. Unique `(orderId, reference)` toàn bảng **không an toàn** (dữ liệu cũ có thể trùng, chưa kiểm). | Migration SQL thủ công + test `db-migration`. | Trung bình | Insert trùng ⇒ lỗi unique |
| `notes` làm "giao thức" | `order-balance.ts:27-30,36,42`; `period-report.ts:544,787`; `PaymentModels.kt`; iOS `OrderDetailLogic.swift:212,218` | `PICKUP`, `SALE`, `RETURN_ADJUSTMENT` do **client** chọn (text tự do). | Thêm `INSTALLMENT`, `CANCEL_REFUND` cũng do client có thể giả. `PICKUP` của app cũ **chứa cả thế chân** (`total − deposit + S − pickupPaid`). Doanh thu theo Payment mà cộng dòng PICKUP thô sẽ lẫn thế chân. | Doanh thu đơn có kế hoạch: chỉ dùng Payment có `installmentId`; phần giao = số học (`pickupTotal − Σ đợt`), giữ nguyên cách tính thế chân từ `securityDeposit`. Cột `Payment.kind` thay cho `notes` ở dòng mới (additive). | Cao | Test PICKUP có thế chân trên đơn có kế hoạch |
| Mô hình `Payment` dùng chung với thuê bao | `schema.prisma` Payment có `subscriptionId`, `merchantId`, `type ∈ {ORDER_PAYMENT, SUBSCRIPTION_PAYMENT, PLAN_CHANGE, PLAN_EXTENSION}`; ghi bởi `stripe/webhook:237`, `lemonsqueezy/webhook:175`, `webhooks/revenuecat:303`, `subscriptions/[id]/{extend,renew}`, `addon-price.ts:130,182` | Đơn: `ORDER_PAYMENT` + `orderId`. | Không chồng chéo trên doanh thu (không ai tổng hợp `Payment` cho doanh thu cửa hàng; chỉ `GET /api/payments` cho PLATFORM_OPS, `payments/route.ts`, **không lọc `type`** nên danh sách ops đã lẫn dòng đơn và sẽ lẫn thêm dòng đợt). | Thêm lọc/hiển thị `type` ở màn ops (tuỳ chọn); mọi truy vấn mới phải lọc `type = ORDER_PAYMENT AND orderId NOT NULL`. | Thấp | Test truy vấn mới không đếm thuê bao |
| Hoàn tiền một đợt | spec §11, không có route riêng cho hoàn đợt | `kind=REFUND` tạo dòng `REFUNDED` dương, không gắn đợt. | Đợt quay về PENDING/PARTIAL, `depositAmount` phải giảm, sự kiện âm đúng ngày hoàn (kịch bản 7). | Route `…/installments/[seq]/refund` (chỉ MERCHANT/OUTLET_ADMIN/ADMIN) hoặc `payments/process` nhận `installmentSeq`. | Cao | Kịch bản 7 |
| Tiền tệ | `Merchant.currency` mặc định `"USD"` (schema), #1145 chỉ hiển thị (`spec.md` #1145 mục API: "No schema change") ; `Payment.currency` cứng VND | Số tiền `Float`. | Đợt "làm tròn đồng" sai với USD 2 số lẻ; ghép `% chia` + phần dư ở đơn vị nhỏ nhất. | Hàm `minorUnit(currency)`; lưu `Payment.currency` theo merchant. | Trung bình | Test chia 3 đợt với USD 100,01 |

### 2.D Khách hàng, điểm thưởng, xuất file, hoá đơn

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| Tổng chi tiêu khách | `customers/[id]/orders/route.ts:140-179,223-225` (`Σ totalAmount`, loại CANCELLED) | Theo giá trị đơn, không theo tiền thu. | Không đổi. Đơn huỷ giữ lại không vào tổng khách (đúng cam kết "CANCELLED loại khỏi xếp hạng"). Không có mô hình công nợ khách trong DB (grep `debt` rỗng). | Ghi chú. | Thấp | — |
| Điểm thưởng (gói có tính năng) | `packages/loyalty/src/order-hooks.ts:102-109` (`totalSpent += totalAmount` khi RETURNED), `earn.ts:21-22`; `status/route.ts:223-251` (huỷ ⇒ `handleLoyaltyOnCancel`) | Tích điểm theo `totalAmount − loyaltyDiscount` lúc trả; không đọc Payment. | Không bị đợt thu ảnh hưởng. Đơn huỷ có tiền giữ lại: điểm bị thu hồi (đúng, chỉ cần ghi). Rủi ro nằm ở D9. | Không đổi. | Thấp | Test huỷ có giữ lại thu hồi điểm |
| Xuất đơn Excel | `orders/export/route.ts:158-159,205-227` (cột `Cọc`, `Tổng đơn`) | Không có cột đã thu/còn lại. | Không hỏng. Xuất không phản ánh đợt ⇒ thiếu giá trị. | Tuỳ chọn thêm cột (additive, cuối bảng). | Thấp | — |
| Xuất khách | `customers/export/route.ts` (không có tổng tiền) | — | Không đổi. | — | Thấp | — |
| QR chuyển khoản | `orders/[orderId]/qr-code/route.ts:117-139` | Số tiền = `computeOrderBalance().amountDue` (RESERVED: toàn bộ còn lại + thế chân); mô tả "Thu coc" nếu `amountToPay == depositAmount` (125). | Với đơn có kế hoạch, QR của app cũ là **toàn bộ** còn lại; heuristic so với `depositAmount` cho mô tả sai. Phát QR theo đợt cần tham số mới. | Tham số `installmentSeq` (additive) ⇒ số tiền = còn lại của đợt; mô tả "Thu dot N". | Trung bình | Test QR theo đợt |
| Biên nhận/hoá đơn | `apps/client/app/orders/receipt/receipt-model.ts` (client); server không sinh hoá đơn đơn hàng (grep `receipt|invoice` chỉ ở thuê bao) | Client ghép từ dữ liệu đơn. | Cần `installments[]` + số biên nhận `#n` theo đơn; số `#n` phải ổn định ⇒ dùng `seq` hoặc id Payment, không đếm lại. | Trả `receiptNo` trong chi tiết đợt. | Thấp | Test thứ tự biên nhận |
| Tìm kiếm/lọc "chưa trả" | `git grep unpaid|paymentStatus` ⇒ không có | Không có bộ lọc theo thanh toán. | Spec không yêu cầu lọc; thêm "trễ hạn" sau này cần index. | Chưa làm. | Thấp | — |

### 2.E Dashboard, vận hành, báo cáo, admin

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| `outlet-operations` | `packages/database/src/outlet-operations.ts:20-30,113-176`; route `analytics/outlet-operations/route.ts:62-97,116` (khối `cash` chỉ với `analytics.view.revenue`) | `cash.depositsHeld.depositAmount = Σ depositAmount`; danh sách kèm `payments` (select 30). | `depositsHeld` vẫn đúng nhờ `depositAmount` được giữ. Thêm `installmentsDue/Overdue/DueTomorrow` cần truy vấn riêng (nhóm theo `dueDateKey`), và **STAFF xem số tiền** trong khi `cash` bị ẩn với họ ⇒ chính sách quyền cần nhất quán. | Truy vấn `OrderInstallment` lọc theo outlet (cần cột `outletId`/join), ẩn số tiền tổng hợp với STAFF nhưng cho thấy từng dòng của mình (chốt D7/câu 7). | Trung bình | Test nhắc theo ngày VN |
| `calendar/orders`, `by-date` | `calendar/orders/route.ts:206-271` (`Σ order.totalAmount`); `by-date/route.ts:45,146-178` (`amountDue` từ groupBy theo `notes`) | `amountDue/refundDue` qua `loadCompletedPaymentSums` (`order-balance-batch.ts:25-36`, nhóm theo `notes`, chỉ COMPLETED). | Không vỡ: dòng `INSTALLMENT` bị bỏ qua vì không phải `PICKUP`. "Doanh thu ngày" của lịch là tổng giá trị đơn, không phải tiền thu (giữ). | Không đổi. | Thấp | Test `amountDue` với đơn có đợt |
| `analytics/period` (Tổng quan) | `period-report.ts` (`totalOrderValue`, `outstanding` 13-29, `collected`, `collectedBreakdown`, `series[].cashCollected`, `futureIncome` 738) | Nguồn là calculator + `order-value`. | Xem 2.A. `series[].expectedCollected` (773-796) dùng PICKUP payments ⇒ mô hình dự kiến cần xem lại. | Cập nhật theo D1. | Cao | Golden `overview` |
| Tổng quan phía client | `apps/client/app/dashboard/overview-model.ts:750,835`; `OverviewDashLogic.swift:502`; `OverviewRelated.kt:143` | Máy khách tính "Còn phải thu" = `total − depositAmount` cho RESERVED; hiển thị sự kiện theo `revenueType`. | `revenueType` lạ (`RENT_INSTALLMENT`) ⇒ app cũ bỏ lý do nhưng **giữ chữ mô tả của API** (`forType … else null`, `OverviewRelated.kt:102-112`, `OverviewDashLogic.swift:452-463`): an toàn nếu `description` là câu tiếng Việt rõ nghĩa. Còn phải thu đúng nhờ `depositAmount`. | Đặt `description` đợt bằng câu tiếng Việt; không đổi chuỗi câu cũ (app cũ ánh xạ câu chính xác, `knownDescriptions`). | Thấp | Test mô tả |
| `analytics/dashboard`, `today-metrics` | `dashboard/route.ts:192-208`, `today-metrics/route.ts:81-101` (`calculateOrderRevenueByStatus`) | Theo trạng thái hiện tại. | Xem 2.A hàm theo trạng thái; thiếu trong spec. | D1. | Trung bình | Test |
| `analytics/system`, `enhanced-dashboard`, `growth-metrics` | `system/route.ts:112-123,167-199` (loại CANCELLED nhưng lại có nhánh CANCELLED trong `OR` ⇒ nhánh chết), `enhanced-dashboard:105-150` (chỉ `createdAt`), `growth-metrics:101-148` | Doanh thu admin/hệ thống từ `calculatePeriodRevenueBatch`. | Doanh thu admin sẽ không biết tiền giữ lại khi huỷ, nhánh `createdAt` bỏ sót đợt. Nhất quán với hiện trạng (đã thiếu) nhưng khác dashboard cửa hàng. | Ghi vào spec "admin sau"; hoặc dùng mapper chung. | Trung bình | — |
| `apps/admin` | `orders/page.tsx:262,353-354`, `merchants/[id]/orders/page.tsx:126-127`, `customers/[id]/orders/page.tsx:181` (Σ `totalAmount`) | Chỉ hiển thị số. | Không vỡ; không hiển thị đợt (spec cho phép "sau"). | — | Thấp | — |
| `admin/cache-stats` | `apps/api/app/api/admin/cache-stats/route.ts:2-13` | Thống kê cache **tìm ảnh**, không liên quan đơn/doanh thu. | Không tác động. | — | Thấp | — |
| Cache HTTP | `analytics/income/route.ts:446-448`, `dashboard:249-251`, `top-customers:266-268`: `ETag` + `private, max-age=60` | App có thể hiển thị số cũ tới 60 giây sau khi thu. | Không sai nhưng "vừa thu mà chưa thấy"; ETag theo nội dung nên đúng sau hết hạn. | Chấp nhận; hoặc xoá cache client sau collect. | Thấp | — |

### 2.F Gói/hạn mức, thuê bao, cron, cờ tính năng

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| Hạn mức gói | `orders/route.ts:691` | Chỉ đếm đơn. | Không đổi. | — | Thấp | — |
| Thuê bao/billing | xem 2.C (cùng bảng `Payment`) | Tách bằng `type`/`subscriptionId`. | Xác nhận không chồng chéo nếu truy vấn lọc `type`+`orderId`. | Lọc rõ ràng. | Thấp | — |
| Cron/nhắc | `apps/api/app/api/cron/{embedding-jobs,loyalty-expire,subscription-expiry-reminders}` | Không có cron cho đơn. | Spec §14 chỉ nhắc nhân viên trên màn hình ⇒ không cần cron/push. Nếu sau này gửi tin cho khách thì cần cron mới (ngoài phạm vi). | Không thêm. | Thấp | — |
| `MOBILE_FEATURES` | `apps/api/lib/mobile-app-config.ts:10-21,56-64` (trống = **bật hết**; `none` = tắt hết; liệt kê = chỉ khoá nêu) | Khoá `onlineBooking` đã thêm theo cách này. | Khoá `installments` mới: nếu production để **trống** thì tự bật cho app mới ngay khi deploy; nếu production có **danh sách tường minh** thì mặc định tắt. Giá trị production thực tế **chưa kiểm chứng** (không đọc production). Cờ chỉ ẩn UI trên app mới, **không** ngăn API nhận `paymentPlan`. | Đặt giá trị tường minh trước release; API từ chối `paymentPlan` khi merchant ở chế độ `PRODUCT` (D, "Cách thu cọc"). | Trung bình | Test cờ ở 3 trạng thái |
| Cài đặt "Cách thu cọc" cấp merchant | spec "Cách thu cọc"; bài học #1138 (đưa cờ vào payload đăng nhập) | Chưa có cột. | Cần cột mặc định `PRODUCT`, đưa vào `user.merchant` ở login/profile; PUT chỉ MERCHANT (giống `PUT /api/settings/currency`, #1145). | Cột nullable + default, kiểm quyền server. | Trung bình | Test quyền, test payload đăng nhập |
| Seed/e2e | `scripts/mobile-e2e/prepare-accounts.sh:175,247` (INSERT thô vào `"Order"`), `scripts/regenerate-entire-system-2025.js:801-869`, `seed.ts:11` (`payment.deleteMany`) | Danh sách cột cố định. | Cột mới nullable/default ⇒ không vỡ INSERT cũ. Cần seed đơn có kế hoạch để e2e (Android+iOS, app cũ mở đơn có kế hoạch). Email seed e2e đổi theo lần seed (bộ nhớ dự án). | Thêm seed mẫu + đơn kế hoạch. | Thấp | E2E hiển thị |
| Import/đồng bộ | `sync-standalone/route.ts:745`, `resume:424`, `admin/import-data:618`, `merchants/[id]/orders/route.ts:173-216` | Tạo đơn kèm `depositAmount` **không có** Payment. | Đơn nhập không có kế hoạch ⇒ đường cũ, không ảnh hưởng. | Ghi rõ: không hỗ trợ `paymentPlan`. | Thấp | — |

### 2.G Cơ sở dữ liệu, hiệu năng, di trú

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| Migration additive | spec mục "API and data" | — | `ADD COLUMN` nullable/default và `CREATE TABLE` là thao tác metadata ⇒ **không đổi dữ liệu cũ**. Cần cờ nhận biết "đơn có kế hoạch" không phải join mỗi lần (đề xuất `Order.hasInstallmentPlan boolean default false`, cập nhật cùng transaction). Nếu xoá hết đợt khỏi đơn đã có Payment đợt ⇒ phải giữ chế độ sự kiện (không quay lại công thức cũ, lịch sử sẽ đổi). | Chốt quy tắc "đơn đã có Payment đợt không thể trở về công thức cũ". | Trung bình | Test kế hoạch bị xoá |
| Backfill | — | — | **Không backfill** đơn cũ: không tạo đợt hay Payment; đơn cũ đi đường cũ. Zero-change chứng minh bằng: golden `income-*`, `overview-*` không đổi byte với STABLE+EDGE. | Ghi vào kế hoạch; không viết script. | Thấp | Chạy 4 golden hiện có |
| Index mới | schema Payment (có `[orderId,status]`, không có `processedAt`); `OrderInstallment("dueDateKey")` (spec) | Báo cáo theo ngày đang lọc `Order` theo cột có index. | Truy vấn "Payment `processedAt` trong kỳ theo outlet" cần index; `OrderInstallment(dueDateKey)` đơn thuần không đủ: nhắc theo outlet phải join `Order`. Bảng `Payment` có thể lớn (chưa kiểm chứng số dòng). | Thêm `Payment(status, processedAt)` hoặc `(merchantId, processedAt)`; `OrderInstallment(dueDateKey, status)` kèm cột phi chuẩn `outletId`; `CREATE INDEX` thường khoá ghi bảng, đo thời gian trên dữ liệu dev trước. | Trung bình | EXPLAIN trên fixture lớn |
| Giới hạn `take: 10000` | `income/daily:209`, `period-report` nhiều chỗ, `top-customers:118` | Cắt ở 10 000 đơn. | Thêm đợt không tăng số đơn, nhưng thêm nhánh `payments.some` có thể chọn thêm đơn cũ ⇒ chạm trần sớm hơn ở shop lớn; hiện đã âm thầm cắt. | Ghi nhận; đo. | Thấp | — |

### 2.H Gói shared (types/validation/utils)

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| Zod đơn | `packages/utils/src/core/validation-schemas.ts` (`orderCreateSchema`); `route.ts:623` | Một schema cho POST; PUT không có. | `paymentPlan` mới; `X-Client-Capabilities` đọc ở header, không ở body. | Thêm schema trong `packages/validation`/`utils`; PUT: validate field mới. | Trung bình | Test zod |
| Types | `packages/types/src/entities/order.ts` (8 chỗ `depositAmount`) | — | Thêm optional `installments`, `installmentSummary`, `cancel*`. | additive | Thấp | `yarn type-check` |
| Hàm chung | `packages/utils/src/core/date-range.ts` (`getLocalDateKey`, `formatDateKeyInTimeZone`) | Có sẵn. | `installments.ts` phải dùng số học khoá ngày, không `Date` nửa đêm. | Theo spec. | Trung bình | Test 2 TZ (`TZ=UTC`, `TZ=Asia/Ho_Chi_Minh`) |

### 2.I Giá theo khối ngày (chỉ chỗ chạm tiền)

| Khu vực | Bằng chứng | Hiện tại | Điều gì hỏng/đổi | Thay đổi cần làm | Rủi ro | Test |
|---|---|---|---|---|---|---|
| Server tính lại `totalAmount` | block-pricing spec §8; hiện `orders/route.ts:909` tin tổng client | Lần đầu server tự tính tổng cho app cũ. | `createGuard.totalAmount` (`route.ts:948`) dùng số client, còn đơn lưu số server ⇒ `findRecentDuplicate` (`where totalAmount = guard`) **không khớp** ⇒ chống trùng #341 mất tác dụng cho đơn BLOCK của app cũ. | Guard dùng tổng đã tính; test replay. | Trung bình | Test replay đơn BLOCK |
| Thứ tự với kế hoạch đợt | spec đợt §3-4 | — | Phải: tính giá khối → giảm giá → loyalty → đợt. Sửa ngày lấy/trả (PUT) đổi `totalAmount` ⇒ tính lại đợt chưa thu; nếu tổng mới < đã thu ⇒ không có quy tắc (quá thu). | Quy tắc: tổng mới < đã thu ⇒ 409 `INSTALLMENT_OVERPAID` hoặc tạo hoàn tiền thủ công. | Trung bình | Test hạ giá sau thu |
| Doanh thu | block-pricing §18 "không đổi công thức" | — | Đúng: doanh thu vẫn từ `totalAmount` đã lưu. | — | Thấp | — |

---

## 3. Doanh thu: 8 kịch bản tính tay

Quy ước: ngày dân sự VN (`Asia/Ho_Chi_Minh`); thế chân `S = 0` trừ khi nêu; tiền VND; "Hiện tại" = đúng công thức `revenue-calculator.ts` (dòng đã dẫn) áp lên dữ liệu thực của kịch bản, không có kế hoạch; "Công thức cũ + kế hoạch" = giữ nguyên công thức nhưng `depositAmount` được server cập nhật theo spec; "Đề xuất" = sự kiện theo ngày thu (spec §15 + đề xuất ở 3.2). Tôi tính tay, chưa chạy code.

### 3.1 Phát hiện kèm theo (đã kiểm chứng bằng đọc code)

1. Ví dụ trong spec (đơn 12.000.000; đợt 1 2.000.000 thu 25/10; đợt 2 10.000.000 thu 13/11; giao 14/11) **tự mâu thuẫn**: nếu `depositAmount` được server giữ = Σ đã thu trước giao = 12.000.000, thì công thức cũ cho 25/10 **+12.000.000** (`RENT_DEPOSIT` tại `createdAt`, dòng 196-209) và 14/11 **+0 (+thế chân)** (`pickupTotal − depositAmount`, dòng 228); không phải "14/11 +12.000.000". Dòng "công thức cũ" đúng chỉ khi `depositAmount` = 2.000.000, tức là khi **không** giữ đúng thiết kế.
2. Kết quả công thức cũ phụ thuộc **thứ tự** thao tác tại ngày giao (thu đợt cuối trước hay sau khi bấm "Giao đồ", xem kịch bản 3): hai thứ tự cho hai bộ số khác nhau.
3. Nơi phải đổi để một số đúng ở mọi màn hình: 13 mapper (2.A), 5 WHERE, `byStatus`, `ForDate`, `totalRevenuePlan` (daily:705), `expectedAtHandOver` (period-report:538), `outstanding` (order-value).

### 3.2 Quy tắc đề xuất tối thiểu (khác spec ở một điểm có chủ ý)

Với **đơn có kế hoạch** (có ≥1 `OrderInstallment`):
- Mỗi Payment đợt COMPLETED = sự kiện `RENT_INSTALLMENT` (+) tại `processedAt` (ngày VN); REFUNDED gắn đợt = sự kiện (−) tại `processedAt` của dòng hoàn.
- `RENT_DEPOSIT` **không** sinh (thay bằng các sự kiện đợt).
- `RENT_PICKUP` = `pickupTotal − Σ(đợt đã thu trước giao) + S` tại `pickedUpAt` (**giữ quy ước cũ**: phần còn lại được coi là thu lúc giao, kể cả khi nhân viên không ghi Payment). Khác spec §15.1 ("khoản thu nốt cũng là một đợt"), vì app cũ và route status không bắt buộc ghi Payment khi giao; theo Payment thuần sẽ thiếu tiền (kịch bản 1b).
- `RENT_RETURN` giữ nguyên (`fees + extension − S`).
- Huỷ: sự kiện (−) = số **hoàn thực tế** tại ngày huỷ (`cancelledAt`, không phải `updatedAt`); phần giữ lại ở lại.

### 3.3 Kịch bản

**K1. Tạo và giao cùng ngày, 2 đợt 50/50**: T = 1.000.000; đợt 1 = 500.000 thu 25/10 09:00; đợt 2 = 500.000 thu lúc giao 25/10 11:00; trả 26/10, S = 0.

| Ngày | Hiện tại (không kế hoạch) | Công thức cũ + kế hoạch | Đề xuất |
|---|---|---|---|
| 25/10 | `isSameDayPickup` ⇒ không `RENT_DEPOSIT`; `RENT_PICKUP = pickupTotal + S` = **+1.000.000** | giống | 500.000 + 500.000 = **+1.000.000** |
| 26/10 | `RENT_RETURN` = 0 | 0 | 0 |

Ngày không đổi nếu cả hai Payment được ghi. **K1b** (nhân viên chỉ thu đợt 1 bằng app mới rồi bấm "Giao đồ" mà không thu đợt 2): "Theo Payment thuần" ⇒ 25/10 **+500.000** (thiếu 500.000, không bao giờ thấy); đề xuất 3.2 ⇒ +1.000.000 (giữ quy ước hiện nay) nhưng phải gắn đợt 2 "đã thu lúc giao" (D2).

**K2. Đặt cọc rồi giao sau**: T = 2.000.000; đợt 1 = 500.000 (25%) thu 20/10; đợt 2 = 1.500.000 thu 24/10 (hạn "trước giao 1 ngày"); giao 25/10 10:00; trả 28/10; S = 0.

| Ngày | Hiện tại (không kế hoạch, cọc 500.000, thu nốt lúc giao) | Công thức cũ + kế hoạch (`depositAmount = 2.000.000`) | Đề xuất |
|---|---|---|---|
| 20/10 | +500.000 | **+2.000.000** | +500.000 |
| 24/10 | 0 | 0 | **+1.500.000** |
| 25/10 | **+1.500.000** | 0 (`2.000.000 − 2.000.000`) | 0 |
| 28/10 | 0 | 0 | 0 |
Tổng 2.000.000 không đổi; phân bố ngày đổi. Golden đổi: không có golden nào (đơn kế hoạch mới).

**K3. Ba đợt 30/20/50**: T = 10.000.000; đợt 1 = 3.000.000 thu 05/11; đợt 2 = 2.000.000 thu 12/11; đợt 3 = 5.000.000 thu lúc giao 20/11 10:00; S = 2.000.000 nhận 20/11; trả 23/11, không phí. (Ví dụ làm tròn: T = 10.000.001 ⇒ đợt 1 = 3.000.000 (3.000.000,3 làm tròn), đợt 2 = 2.000.000, đợt cuối = phần còn lại 5.000.001.)

| Ngày | Công thức cũ + kế hoạch, **thu đợt 3 SAU khi bấm giao** (`D = 5.000.000`) | Công thức cũ + kế hoạch, **thu đợt 3 TRƯỚC khi bấm giao** (`D = 10.000.000`) | Đề xuất (tổng gồm thế chân) | Đề xuất "đã thu" (không thế chân) |
|---|---|---|---|---|
| 05/11 | +5.000.000 | +10.000.000 | +3.000.000 | +3.000.000 |
| 12/11 | 0 | 0 | +2.000.000 | +2.000.000 |
| 20/11 | `T − D + S` = +7.000.000 | `0 + S` = +2.000.000 | 5.000.000 + 2.000.000 = +7.000.000 | +5.000.000 |
| 23/11 | −2.000.000 | −2.000.000 | −2.000.000 | 0 |
Minh hoạ rủi ro 3.1(2): cùng một đơn, hai thứ tự thao tác cho hai bảng khác nhau với công thức cũ.

**K4. Huỷ có giữ lại**: T = 4.000.000; đợt 1 = 1.000.000 (`nonRefundable`) thu 10/11; đợt 2 = 1.000.000 thu 15/11; đợt 3 = 2.000.000 chưa thu; huỷ 18/11 trước giao; giữ 1.000.000, hoàn 1.000.000.

| Ngày | Hiện tại (không kế hoạch, cọc 2.000.000 từ đầu) | Công thức cũ + kế hoạch (`D = 2.000.000`) | Đề xuất | Đề xuất, app cũ huỷ không gửi số |
|---|---|---|---|---|
| 10/11 | +2.000.000 | +2.000.000 | +1.000.000 | +1.000.000 |
| 15/11 | 0 | 0 | +1.000.000 | +1.000.000 |
| 18/11 | −2.000.000 (`RENT_CANCELLED = D`, dòng 290-293) | −2.000.000 | −1.000.000 (hoàn) | −2.000.000 (như cũ: hoàn hết) |
| Tổng ròng | 0 | 0 | **+1.000.000** | 0 (nhưng không có dòng `REFUNDED` nào trong `Payment`) |
Thêm: (a) ngày huỷ hiện lấy từ `updatedAt` (dòng 274): sửa ghi chú ngày 20/11 làm sự kiện nhảy sang 20/11; (b) `batch-delete` đơn huỷ này ⇒ mất +1.000.000 khỏi 10/11 và 15/11 (đề xuất) vì WHERE lọc `deletedAt: null`; (c) `top-customers` loại đơn huỷ (`route.ts:97`), nên khách này không có chi tiêu mặc dù tiệm giữ 1.000.000.

**K5. Gia hạn sau khi giao (#505)**: T = 3.000.000; đợt 1 = 1.000.000 thu 01/11; đợt 2 = 2.000.000 thu 04/11; giao 05/11 10:00 (`pickupTotalAmount = 3.000.000`); gia hạn 06/11 nâng `totalAmount` lên 3.600.000 (+600.000); trả 10/11; S = 0.

| Ngày | Hiện tại (không kế hoạch, cọc 1.000.000) | Công thức cũ + kế hoạch (`D = 3.000.000`) | Đề xuất đúng |
|---|---|---|---|
| 01/11 | +1.000.000 | +3.000.000 | +1.000.000 |
| 04/11 | 0 | 0 | +2.000.000 |
| 05/11 | +2.000.000 | 0 | 0 |
| 10/11 | `extension` = +600.000 | +600.000 | +600.000 |
Hai lỗi cài đặt có thể xảy ra: (i) kiểm `INSTALLMENT_SUM_MISMATCH` theo `totalAmount` (3.600.000 ≠ 3.000.000) ⇒ `PUT` gia hạn của app cũ trả 400, **chặn tính năng #505**; (ii) tự tính lại đợt chưa thu / thêm 600.000 vào đợt cuối ⇒ 600.000 vừa vào đợt vừa vào `RENT_RETURN` ⇒ khi thu đợt, doanh thu trùng 600.000. Kết luận: sau giao, kế hoạch so với `pickupTotalAmount`; phần gia hạn không phải đợt.

**K6. Phí hư hỏng và phí trễ**: T = 2.000.000; đợt 1 = 1.000.000 thu 20/11; đợt 2 = 1.000.000 thu 24/11; S = 1.000.000 nhận 25/11; giao 25/11; trả 29/11 với `damageFee 100.000`, `lateFee 50.000`.

| Ngày | Hiện tại (cọc 1.000.000) tổng / đã thu (không thế chân) | Đề xuất tổng / đã thu |
|---|---|---|
| 20/11 | +1.000.000 / +1.000.000 | +1.000.000 / +1.000.000 |
| 24/11 | 0 / 0 | +1.000.000 / +1.000.000 |
| 25/11 | +2.000.000 (`T − D + S`) / +1.000.000 | +1.000.000 (`2.000.000 − 2.000.000 + S`) / 0 |
| 29/11 | `150.000 − 1.000.000` = −850.000 / +150.000 | −850.000 / +150.000 |
Phí không phải đợt, không vào kế hoạch; `INSTALLMENT_SUM_MISMATCH` phải so với tiền thuê, không với `damageFee/lateFee` (sửa được đến lúc trả).

**K7. Hoàn một đợt (không huỷ)**: T = 2.000.000; đợt 2 = 1.500.000 thu 24/10 tiền mặt, hoàn 26/10 vì thu nhầm (đơn còn RESERVED, giao dự kiến 30/10).
- Hiện tại: dòng `Payment` kiểu `REFUND` không ảnh hưởng doanh thu (calculator không đọc Payment) và không đổi `depositAmount` ⇒ không dấu vết trong báo cáo.
- Đề xuất: 24/10 +1.500.000; 26/10 −1.500.000; đợt 2 về `PENDING`; `depositAmount` giảm 1.500.000 (nếu quên: ngày giao, `pickupTotal − D` thiếu 1.500.000 vĩnh viễn).
- `totalPaid` trong `PUT` response (`[orderId]/route.ts:1003`) và `order.ts:1663` cộng cả dòng REFUNDED ⇒ hiển thị "đã trả" 3.000.000 thay vì 0.

**K8. Biên múi giờ 00:30 VN**: T = 1.000.000; đợt 2 = 500.000 thu **13/11 00:30 VN = 2026-11-12T17:30:00Z**; `dueDateKey = 2026-11-13`.
- Đúng (`formatDateKeyInTimeZone`): sự kiện thuộc **13/11**; trạng thái `DUE_TODAY`. Đến `2026-11-13T17:00:00Z` (= 14/11 00:00 VN) thành `OVERDUE`, `lateDays = 1`.
- Sai thường gặp (`processedAt.toISOString().slice(0,10)`): rơi vào **12/11**, đợt "thu trước hạn 1 ngày".
- Cửa sổ truy vấn: WHERE phải mở rộng ±1 ngày dân sự rồi lọc chính xác (như `income/daily:76-78` và `income-period-summary.ts:75-85`), nếu lọc theo ngày UTC thì sự kiện lúc 00:30 VN đầu kỳ bị sót.
- `collectedOn` (spec §6, nhập tay `YYYY-MM-DD`): cần chọn instant lưu (đề xuất 12:00 VN của ngày đó để không rơi biên) và lưu thêm khoá ngày; chưa có quy tắc trong spec.
- Test bắt buộc: hai lần chạy `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` với 16:59:59Z / 17:00:00Z.

### 3.4 Golden test nào đổi

Không chạy test (chỉ đọc). Theo đọc `tests/api-compat/*` và `tests/helpers/fake-order-store.ts`:

| Tệp | Đổi? | Lý do |
|---|---|---|
| `tests/api-compat/golden/income-daily-main-real.json`, `income-orders-main-real.json` | **Nội dung không đổi** nếu đường cũ giữ nguyên (STABLE/EDGE_ORDERS không có kế hoạch, `income-scenarios.ts`). | Phải chứng minh bằng chạy lại. |
| `income-daily-api-compat.test.ts`, `income-orders-api-compat.test.ts`, `income-compat.ts` | **Phải sửa**: `withoutAdded` cần danh sách đường dẫn mới (`installmentsDue…`, `futureInstallments`, `revenueType` mới), và cần dữ liệu `payments` trong store giả. | Store giả `fake-order-store.ts` chỉ hỗ trợ `equals/in/notIn/not/gt/gte/lt/lte/OR/AND/NOT` (dòng 10, 68-75): **không hỗ trợ lọc quan hệ** (`payments: { some }`), nên route sau khi thêm nhánh WHERE sẽ không chạy trong harness hiện tại. |
| `golden/overview-before-492.json`, `overview-api-compat.test.ts` | Không đổi nội dung; test cần fixture đơn kế hoạch mới. | |
| `golden/order-create-main-real.json`, `order-create-api-compat.test.ts` | Phản hồi `POST` thêm khoá (`installments`, `installmentSummary`, `cancel…`) ⇒ cần thêm vào danh sách "added". Body app cũ (không `paymentPlan`) phải ra đúng như cũ. | |
| `tests/revenue-calculator.test.js`, `tests/income-analytics-actual.test.js` | Giữ case cũ, thêm 8 kịch bản. | |

---

## 4. Những thứ KHÔNG được đổi (app cũ nhìn thấy) và cách bảo vệ

| # | Trường/hành vi | Ai đọc | Cách bảo vệ |
|---|---|---|---|
| 1 | `Order.depositAmount` = tổng đã thu trước khi giao | iOS `OrderDetailLogic.swift:203-237`, Android `OrderDetailLogic.kt:109-181`, `computeOrderBalance`, QR, `outstanding`, `Related` rows | Server giữ bất biến (D3); test hợp đồng: sau mỗi thao tác `depositAmount == Σ installment-payments trước giao` |
| 2 | `Order.totalAmount`, `pickupTotalAmount` (#505) | mọi app, `revenue-calculator` | Đợt không bao giờ sửa `totalAmount`; sau giao kế hoạch so `pickupTotalAmount` (D5) |
| 3 | `securityDeposit`, `collateral*`, `damageFee`, `lateFee`, `discount*`, `loyalty*` | app cũ, calculator | Không đổi nghĩa; không vào đợt (spec §9); kiểm tổng đợt không tính phí |
| 4 | `payments[]` (`id, amount, method, status, reference, notes, processedAt, createdAt`) | iOS `Payment` (`Order.swift:971-977`), Android `paid(payments, notes)` | Không đổi tên/kiểu; dòng đợt dùng `notes='INSTALLMENT'` (không phải `PICKUP`), dòng sau giao dùng `PICKUP`; lọc dòng đợt cho client cũ **chỉ** sau khi bước 0 xác nhận (D8); chưa kiểm chứng |
| 5 | Ý nghĩa `notes ∈ {PICKUP, SALE, RETURN_ADJUSTMENT}` | `order-balance.ts:27-45`, `period-report.ts:544,787`, app | Không đổi, không thêm vào cùng bucket; không bao giờ cùng một khoản vừa ở `depositAmount` vừa ở `PICKUP` |
| 6 | `POST /api/payments/process` hợp đồng (`reference` 8-100, `kind`, trả `payment`, 201/`ORDER_PAYMENT_ALREADY_PROCESSED`) | Android `DefaultPaymentRepository.kt:48` | Chỉ thêm kiểm tra cho **đơn có kế hoạch**; test với payload app cũ |
| 7 | `amountDue` / `refundDue` trong danh sách, lịch | app cũ | Giữ `computeOrderBalance`; đợt chỉ thêm `installmentRemaining`, `nextInstallmentDue` |
| 8 | `revenueType` và chuỗi `description` của sự kiện | `OverviewRelated.kt:70-112`, `OverviewDashLogic.swift:436-463` ánh xạ **chính xác** câu cũ | Không sửa chữ câu cũ; loại mới = chuỗi mới, có mô tả tiếng Việt rõ nghĩa |
| 9 | `futureIncome` (Android cũ cộng vào thanh doanh thu) | Android | Giữ nghĩa; đợt dự kiến sang `futureInstallments` (spec §15.4) |
| 10 | Cấu trúc `GET /analytics/income*`, `period` (các khoá cũ) | app cũ + golden | Chỉ thêm khoá; golden `withoutAdded` |
| 11 | `PUT /api/orders/[orderId]` chỉ `{status}` (iOS/Android) và gia hạn `PUT totalAmount` | app cũ | Không 400 khi gửi `totalAmount`/`depositAmount`: bỏ qua có kiểm soát |
| 12 | Chống trùng tạo đơn #341 (khoá `Idempotency-Key`, 60 giây) | app cũ không gửi khoá | Đợt tạo trong `afterInsert`; guard dùng tổng đã lưu |
| 13 | Vai trò: STAFF trả thế chân (`REFUND` + `RETURN_ADJUSTMENT`) | Android cũ | Không chặn REFUND tổng quát (D7) |
| 14 | `outlet-operations` các khoá cũ (`cash.*`) | app cũ | Chỉ thêm khoá; `analytics.view.revenue` giữ |

---

## 5. Điều chưa kiểm chứng

1. iOS `main-real` không giải mã được `payments[]` thật (nghi vấn bước 0 plan): chỉ đọc khai báo `Payment{paymentMethod, paymentDate}` (`Order.swift:971-977`), chưa chạy build; có thể có `init(from:)` tuỳ biến mà tôi không thấy.
2. Quy trình giao hàng của iOS cũ có gọi `payments/process` với `PICKUP` trước khi đổi trạng thái hay không: đã đọc Android (`PaymentModels.kt`, `PaymentCollectionSheet.kt`) và tên hàm iOS (`OrderDetailLogic.swift:212,218`), chưa đọc luồng iOS đầy đủ.
3. Giá trị `MOBILE_FEATURES` ở production (trống hay danh sách): không đọc production (cấm).
4. Số dòng và khả năng trùng `(orderId, reference)` trong bảng `Payment` production; thời gian tạo index: chưa đo.
5. CORS có cho phép header `X-Client-Capabilities` từ web/Vercel không: chưa kiểm; header chưa tồn tại trong code (`git grep` rỗng).
6. Kết quả chạy các test/golden: **chưa chạy** (tài liệu chỉ đọc). Kết luận "golden không đổi" là suy luận từ `income-scenarios.ts` và điều kiện đường cũ giữ nguyên.
7. Cách `income/route.ts` dùng `getOrderRevenueForDate` nhánh RETURNED (trả `totalAmount + fees` cho mọi ngày sau, `revenue-calculator.ts:616`) trong chuỗi ngày: chưa lần theo; có thể là hành vi hiện có đã được lọc ở nơi gọi.
8. Hành vi `prisma migrate dev` với unique index một phần (SQL thô): dựa trên hiểu biết chung, chưa thử.
9. `analytics/orders`, `analytics/recent-orders`, `calendar/orders/count`, `orders/cursor`, `orders/statistics` chỉ tìm bằng grep (không thấy chạm Payment/`depositAmount`); chưa đọc từng route.
10. Trang `apps/admin` đọc qua grep dòng `depositAmount/totalAmount`, chưa mở từng trang.
11. `pickedUpAt` không hợp lệ (chuỗi lạ) ở route status: Prisma sẽ lỗi 500? chưa thử.
12. Khối `analytics/system`: nhánh CANCELLED trong `OR` có thật sự là nhánh chết (do `status: { not: CANCELLED }` đứng cùng cấp) — chưa chạy truy vấn; nhận định từ đọc `findManyLightweight` where.
13. Giá theo khối: tôi chỉ đọc spec và chỗ server hiện tại (`orders/route.ts:795-909`, `[orderId]/route.ts:730-770`), chưa có code BLOCK để xác nhận ảnh hưởng guard #341.
14. Sổ đăng ký quyền chi tiết `ROLE_PERMISSIONS` cho `payments.*`: `payments/process` dùng danh sách vai trò cứng, không có khoá quyền; chưa kiểm tra vai trò tuỳ chỉnh (custom role) có thể tới đây hay không.
15. Chưa kiểm tra "bước 0" của plan (đã nêu), chưa đo hiệu năng truy vấn mới.

---

## 6. Việc cần làm theo thứ tự (tóm lược, không viết code)

1. Bước 0 của plan (iOS main-real với 1 Payment), ghi kết quả vào issue.
2. Chốt D1-D10 và câu 7 của spec; sửa ví dụ doanh thu trong spec (xem 3.1).
3. Test đỏ trước: 8 kịch bản mục 3 vào `tests/revenue-calculator.test.js`; test race của `collect`; test PUT app cũ/revert/gia hạn.
4. Mở rộng harness `fake-order-store` để hỗ trợ `payments.some` hoặc đổi cách tải sang truy vấn thứ hai (`payment.findMany` theo kỳ), rồi mới đổi WHERE.
5. Một `toRevenueOrderData` + một `buildEventWhere`, thay 13 mapper.
6. Migration additive (cột nullable, bảng mới, index, SQL thô cho unique một phần), cờ `hasInstallmentPlan`.
7. Hàm `recomputeDepositFromPayments`, gọi từ mọi đường ghi (kể cả `revert`, status, `payments/process`).
8. Thêm dòng vào `.agent/api-changes/LOG.md` và bảng `## API compatibility` mỗi PR; `release-review` chạy lại 4 golden.
