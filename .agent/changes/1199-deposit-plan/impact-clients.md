# Đánh giá tác động phía client và app cũ — Thu theo tiến độ + "Cách thu cọc" + giá theo khối ngày

Ngày rà: 2026-10-25 · Chế độ: chỉ đọc (không sửa code, không chạm production) · Spec gốc: `./spec.md`, `./plan.md`, `../drafts-block-pricing/spec.md`
Nguồn mã: `origin/dev` (37b3d6f48) cho "app mới"; tag `release-2026-10-12.2` (57ed5ef88, nằm trong `origin/main-real`) cho "app cũ đã cài". `file:line` bên dưới là của tag (app cũ) hoặc `origin/dev` (web/API), có ghi rõ.
Câu hỏi của chủ shop: "cần đánh giá lại tác động hệ thống, doanh thu" — tài liệu này chỉ trả lời phần client và app cũ; phần server/doanh thu xem `spec.md` mục "Doanh thu và báo cáo".

---

## 1. Tóm tắt điều hành

### 1.1 Kết luận một câu

Thiết kế "giữ `depositAmount` = tổng đã thu trước khi giao" là đúng hướng: công thức "Thu khi giao" của cả 3 nền tảng cũ đều dựa vào đúng đại lượng đó nên số tiền hiển thị vẫn đúng. Nhưng có **một lỗi sẵn có chưa ai thấy làm cho phương án hiện tại không an toàn**: iOS cũ không giải mã được `payments[]` của API (đã kiểm chứng bằng script Swift, mục 5). Thu theo đợt sẽ tạo `Payment` cho **mọi** đơn có kế hoạch, nên nếu không xử lý trước, iOS cũ sẽ không mở được các đơn đó (kể cả từ push, in, chia sẻ). Cần chốt các quyết định ở 1.3 trước khi viết PR 1.

### 1.2 Mười rủi ro xếp hạng

| # | Rủi ro | Mức | Nền tảng | Giảm thiểu chính |
|---|---|---|---|---|
| 1 | **iOS cũ không mở được đơn có ≥1 `Payment`**: struct `Payment` bắt buộc `paymentMethod` + `paymentDate`, API trả `method` + `processedAt`. Hiện chỉ không lộ vì iOS và web không tạo Payment (chỉ Android UI cũ và dữ liệu seed). Thu theo đợt biến nó thành lỗi hàng loạt (chi tiết đơn, push, in, chia sẻ đều dùng chung `loadOrderDetail`). **ĐÃ KIỂM CHỨNG.** | Cao | iOS cũ | API trả thêm alias `paymentMethod`/`paymentDate` cho mọi client (sửa luôn lỗi cũ) **và** ẩn dòng `INSTALLMENT` khỏi `payments[]` cho client không khai báo hỗ trợ. Làm thành PR riêng, vào dev và main-real trước PR 1. |
| 2 | **Chưa có cơ chế "client khai báo hỗ trợ"**: `X-Client-Capabilities` không tồn tại ở đâu trong `origin/dev` (grep không ra). Mọi biện pháp bảo vệ app cũ (ẩn INSTALLMENT, server tự tính giá khối) dựa vào nó. Web cũ (tab mở lâu) cũng không gửi. | Cao | API + web + 2 app | Làm cơ chế trước (PR riêng): đọc header, mặc định = "client cũ". Web mới và app mới gửi header. Có test "không header = hành vi hôm nay". |
| 3 | **Server tin tổng tiền client gửi**: `POST /api/orders` lấy `unitPrice`/`totalPrice`/`totalAmount` từ client (`apps/api/app/api/orders/route.ts:804-811, 909`); `PUT` giữ `totalAmount` client gửi (`apps/api/app/api/orders/[orderId]/route.ts:757`). App cũ gửi giá ngày 1 cho sản phẩm khối ngày (iOS `Cart.swift:800-823, 846`; Android `CartOrderSubmit.kt:43-45`) → đơn thấp hơn giá thật, mất tiền; sửa đơn cũ ghi đè tổng đúng bằng tổng sai. | Cao (tiền) | iOS, Android, web cũ | Server tính lại tổng cho mọi dòng BLOCK khi không có header (cả POST và PUT, kể cả khi client chỉ gửi `totalAmount`); giữ `pricingSnapshot`. Test PUT từ app cũ. Phương án A của block-pricing chỉ đúng nếu làm được điều này. |
| 4 | **Giao hàng bằng app cũ lệch kế hoạch**: app cũ giao bằng `PUT status=PICKUPED` không kèm Payment (iOS không có call site tới `payments/process`; Android UI mới cũng không gọi, `HandOverReturnNoPaymentTest.kt:25`). Đơn có đợt 2 chưa thu sẽ thành `PICKUPED` nhưng kế hoạch còn "chưa thu", trong khi công thức doanh thu cũ ghi `RENT_PICKUP = tổng − cọc` vào ngày giao. | Cao | iOS, Android, web cũ | Quy tắc server khi chuyển sang `PICKUPED`: các đợt chưa thu được "thu khi giao" tự động (Payment `notes='PICKUP'`, ghi audit "tự đối soát khi giao"), khớp ngữ nghĩa cũ "Thu khi giao = phần còn lại". Cần chủ shop chốt (D1). |
| 5 | **Huỷ đơn bằng app cũ không có "giữ/hoàn"**: iOS `OrderService.cancelOrder` chỉ gửi `{status:"CANCELLED"}` (`OrderService.swift:~612`), Android `changeStatus("CANCELLED")` (`OrderDetailV2Screen.kt:450`). Theo spec "không gửi → như cũ" nên doanh thu ghi hoàn **toàn bộ** (`revenue-calculator.ts:273-303`), chính sách "đợt không hoàn" bị bỏ qua êm. | Cao (tiền, tranh chấp) | iOS, Android, web cũ | Chốt mặc định (D2). Đề xuất: không có body = hoàn toàn bộ như cũ nhưng gắn cờ `cancelSource=LEGACY_CLIENT` + audit, và web hiện cảnh báo "huỷ từ app cũ, chưa áp chính sách" để chủ shop sửa tay. |
| 6 | **Đếm trùng "Đã thu"** ở luồng sửa đơn của app cũ: khi không có danh sách payments, "Đã thu" = `depositAmount + totalPaid` (iOS `ProductsV2.swift:743-745`; Android `EditOrderSheet.kt:127`), mà `totalPaid` của danh sách đơn là SUM mọi Payment (`packages/database/src/order.ts:1656-1663`, bản COMPLETED ở `:1950-1964`). Đợt đã thu vừa nằm trong `depositAmount` vừa nằm trong `totalPaid` → "Đã thu" gấp đôi, "Thu khi giao" hiển thị sai trên màn sửa. | Trung bình-Cao | iOS, Android | `totalPaid`/`paymentCount` của danh sách cho client cũ loại dòng `INSTALLMENT`. Test: đơn có kế hoạch mở sửa từ danh sách bằng app cũ. |
| 7 | **Tổng quan/doanh thu**: các số do server tính nên app cũ hiển thị đúng, nhưng có 2 ràng buộc ngầm: (a) màn "Xem các đơn liên quan" cộng lại phía client và phải bằng thẻ (`OverviewDashLogic.swift` `relatedRows`, `OverviewRelated.kt`, `overview-model.ts:835`: "Còn phải thu" = `total − depositAmount` của đơn `RESERVED`); (b) Android cũ cộng `futureIncome` vào doanh thu (`OverviewScreen.kt:567`). `revenueType` lạ (vd `RENT_INSTALLMENT`) rơi về câu mô tả tiếng Việt của API — không vỡ nhưng sai ngôn ngữ ở app ja/ko/zh. | Trung bình | 3 nền tảng | Giữ `futureIncome` nguyên nghĩa, thêm `futureInstallments` (đã có trong spec). Giữ đẳng thức "tổng dòng = thẻ" bằng test `tests/api-compat/*income*` với dữ liệu có kế hoạch. Dùng `description` tiếng Việt cố định cho `RENT_INSTALLMENT` và thêm vào `knownDescriptions` ở bản app mới. |
| 8 | **Cài đặt "Cách thu cọc" không tới được app cũ**: app cũ không đọc cờ, nhân viên dùng app cũ vẫn tạo đơn theo "Cọc theo sản phẩm" dù shop đã chọn "Theo đợt" → dữ liệu lẫn lộn; đồng thời bài học #1138 (cờ phải có trong payload đăng nhập/hồ sơ). `MOBILE_FEATURES` để trống = bật mọi khóa (`apps/api/lib/mobile-app-config.ts:56-66`). | Trung bình | iOS, Android | Server không tự gán kế hoạch cho đơn từ app cũ; báo cáo "đơn tạo từ app cũ không có kế hoạch"; web hiện banner "n nhân viên còn dùng app cũ" (đã có phiên bản app trong đăng nhập?). Đặt `MOBILE_FEATURES` tường minh ở production trước release. |
| 9 | **Admin `/api/payments` lẫn thanh toán của shop**: route cho `PLATFORM_OPS_ROLES` liệt kê mọi Payment không lọc loại (`apps/api/app/api/payments/route.ts:8-100`); các đợt (`ORDER_PAYMENT`) sẽ hiện như "Manual Payment" trong bảng thanh toán gói của nền tảng, có thể lẫn vào tổng. Tương tự `packages/ui` (admin) tính "còn lại" bằng `total − depositAmount` mà không xét Payment (`order-money.ts:51`, `utils.ts:33,133`). | Trung bình | admin web | Thêm lọc `type != ORDER_PAYMENT` (hoặc cột loại) ở route; thêm test. Admin chưa cần UI đợt. |
| 10 | **Sửa sản phẩm bằng app cũ xoá option BLOCK**: iOS `ProductPricing.options` chỉ sinh FIXED/DAILY (`ProductsV2.swift:139-158`), Android `ProductPricing.options` tương tự (`ProductRules.kt:128-138`). Sửa tên/ảnh một sản phẩm khối ngày bằng app cũ → mất bảng giá. Giỏ app cũ chỉ thấy giá ngày 1 nên nhân viên báo giá sai cho khách. | Trung bình | iOS, Android | Spec block-pricing mục 9: server giữ option BLOCK khi không có `pricingSchemaVersion: 2` (thêm test); ghi vào hướng dẫn "chưa báo giá khối ngày bằng app cũ". |

Rủi ro còn lại (thấp hơn, ở các bảng chi tiết): nháp offline (mục 2.5), đổi tổng tiền sau gia hạn `pickupTotalAmount` (#505), giảm giá thành viên (`loyaltyDiscount`) có nằm trong nền tính đợt không (D6), test hiện có bị vỡ (mục 2.6), khóa i18n mobile chỉ có `en`/`vi` còn web có 12 thư mục `locales/` (mục 2.7), trợ năng (mục 2.8).

### 1.3 Quyết định cần chủ shop/owner chốt (thêm vào 7 câu của spec)

| # | Câu hỏi | Đề xuất |
|---|---|---|
| D1 | Giao hàng từ app cũ khi còn đợt chưa thu: tự coi là đã thu (theo ngữ nghĩa "Thu khi giao" cũ) hay chặn? | Tự thu (không chặn được vì app cũ không hiểu lỗi mới), có audit. |
| D2 | Huỷ từ app cũ (không có số giữ/hoàn): hoàn toàn bộ như cũ hay giữ phần "không hoàn" theo mẫu? | Hoàn toàn bộ như cũ + cờ LEGACY + cảnh báo trên web. Tránh server tự quyết giữ tiền khách. |
| D3 | Có làm PR riêng "alias payments + ẩn INSTALLMENT + capability header" trước, đưa lên main-real độc lập không? | Có. Đây cũng sửa lỗi sẵn có cho iOS cũ. |
| D4 | Block-pricing cho app cũ: phương án A (server tính, đề xuất) hay B (chặn)? Với A, chấp nhận giỏ app cũ hiện giá ngày 1? | A, kèm cảnh báo trong hướng dẫn cho nhân viên. |
| D5 | Có nâng `IOS_MIN_VERSION`/`ANDROID_MIN_VERSION` không? Hiện mặc định `0.0.0` (không ép). | Không ép chung. Chỉ cân nhắc khi thấy tỉ lệ dùng app cũ thấp; thay bằng thông báo mềm. |
| D6 | Nền tính các đợt là `totalAmount` hay `totalAmount − loyaltyDiscount`? Web tính `dueAtPickup` sau loyalty (`create-model.ts:~513-516`), còn `computeOrderBalance` và app cũ thì không trừ loyalty. | Dùng `totalAmount` như app cũ; cấm dùng điểm thành viên khi đơn có kế hoạch cho tới khi chốt. |
| D7 | Bật chế độ "Theo đợt" trên web trước hay sau khi app mobile mới có mặt trên store? | Sau (mục 4). |

---

## 2. Bảng theo nền tảng

Quy ước cột: **Screen/logic | Evidence file:line | Hôm nay | Thay đổi/tác động | Rủi ro | Test**. "Mới" = app/web sau thay đổi; "Cũ" = tag `release-2026-10-12.2` hoặc tab web mở lâu.

### 2.1 Web (`apps/client`, `origin/dev`)

| Screen/logic | Evidence | Hôm nay | Thay đổi/tác động | Rủi ro | Test |
|---|---|---|---|---|---|
| Giỏ/tạo đơn: tính tiền | `apps/client/app/orders/create/create-model.ts:495-523` `computeTotals`; `lineTotal` `:343` → `computeOrderLineTotal` | `autoDeposit = Σ deposit×qty`; `dueAtPickup = max(0, afterLoyalty − deposit) + thế chân` | Chế độ "Theo đợt": ẩn ô cọc, `depositAmount` = đợt 1; thêm `paymentPlan` vào payload; dòng BLOCK tính qua `computeBlockPrice` | Trung bình (loyalty: D6) | mở rộng `tests/order-form-line-pricing.test.ts` |
| Payload tạo/sửa đơn | `create-model.ts:578-622` `buildPayload` | Luôn gửi `depositAmount`, `totalAmount`, giá từng dòng; kiểu giá lạ gửi thành `FIXED` (`:600-606`) | Thêm `paymentPlan`; dòng BLOCK gửi `pricingType` thật + header `X-Client-Capabilities`. Tab cũ vẫn gửi `FIXED` + giá ngày 1 | Cao với tab cũ (#3) | `tests/api/orders-block-pricing.test.ts` |
| Màn xác nhận tạo đơn | `confirm-model.ts:91` `collect: isSale ? dueAtPickup : payload.depositAmount` | Dòng "Thu ngay" = cọc | "Thu ngay đợt 1" + hình thức; chặn thu thừa | Thấp | thêm case vào test confirm |
| Chi tiết đơn: "Thu khi giao" | `apps/client/app/orders/orders-model.ts:355-372` `paidOf`/`handOverMoney` (`total − deposit + thế chân − PICKUP`) | Mirror iOS `OrderDetailLogic` | Thêm thẻ tiến độ; không đổi `handOverMoney`. Dòng payment `INSTALLMENT` bị bỏ qua (đúng) | Thấp | golden đơn có kế hoạch |
| Chi tiết đơn: dòng tiền | `orders-model.ts:515` (`depositPaid`) | "Đã cọc" | Đổi nhãn khi có kế hoạch ("Đã thu trước khi giao") | Thấp | snapshot nhãn 5 locale |
| Lịch sử đơn | `orders-model.ts:555-570` `buildHistory` | Mọi Payment COMPLETED hiện là sự kiện "payment" (hoàn nếu `notes` khớp /REFUND/) | Đợt hiện như sự kiện thanh toán (đúng); `CANCEL_REFUND` khớp regex REFUND (đúng) | Thấp | thêm case |
| In/biên nhận | `apps/client/app/orders/receipt/receipt-model.ts:196-200`; `ReceiptSlip.tsx`; `packages/ui/.../Orders/components/ReceiptPreviewModal.tsx:344` | Một dòng "Đã cọc" | Biên nhận từng đợt (#n, còn lại, chính sách); dòng BLOCK dùng `itemCalcText` (`receipt-model.ts:151`) | Trung bình (hai nơi in: client + packages/ui) | `tests/web-receipt-model.test.ts` |
| Danh sách đơn | `orders-model.ts:221-242` (đọc `amountDue`, `refundDue` từ API) | Số do server | Thêm chip "Đợt 2 trễ n ngày" từ `nextInstallmentDue` | Thấp | test chip, TZ |
| Tổng quan | `apps/client/app/dashboard/overview-model.ts:185-241, 547, 835` | Số do server; "Còn phải thu" theo hàng = `total − depositAmount` | Thẻ "Cần thu"/"Trễ hạn" mới; đẳng thức hàng = thẻ phải còn đúng | Trung bình (#7) | `tests/api-compat/overview-api-compat.test.ts` + golden mới |
| Lịch | `apps/client/app/calendar/calendar-model.ts:130,179` | Dùng `amountDue` của API | Không đổi | Thấp | — |
| Khách hàng chi tiết | `apps/client/app/customers/customers-model.ts:107-121` | `spent = summary.totalAmount` (không gồm đơn huỷ) | Đơn huỷ nhưng tiệm giữ cọc không vào "đã chi"; chấp nhận, ghi chú | Thấp | `tests/api/customer-orders-summary-cancelled.test.ts` |
| Sản phẩm: bảng giá khối | `apps/client/app/products/form/form-model.ts:15`, `ProductFormPage.tsx:580` | FIXED/DAILY | Tab thứ ba; gửi `pricingSchemaVersion: 2` | Trung bình | thêm test form |
| Nháp tạo đơn | `OrderEditor.tsx:242` (`useState(draft?.depositAmount ?? null)`); grep không thấy `localStorage` trong `orders/create` | Nháp là state phiên | Không có nháp lưu bền → không vấn đề tương thích | Thấp | — |
| Cài đặt tiệm | `apps/client/app/settings/**` | — | "Cách thu cọc", mẫu, chính sách; chỉ MERCHANT đổi | Trung bình (D7: bật sau mobile) | test quyền |
| Quyền | `packages/constants/src/status.ts:170` `isStaffLikeRole`; API `orders/[orderId]/route.ts:1106` | Staff sửa `depositAmount` tự do (plan.md ghi nhận) | UI ẩn, API từ chối: sửa kế hoạch, hoàn tiền, số giữ/hoàn | Trung bình (đổi hành vi staff) | test API 403 theo vai trò |
| Tab cũ | không gửi header | — | Xem ma trận mục 3 | Cao (#3,#4,#5) | e2e với bundle cũ |

### 2.2 Admin (`apps/admin`, `packages/ui`)

| Screen/logic | Evidence | Hôm nay | Thay đổi/tác động | Rủi ro | Test |
|---|---|---|---|---|---|
| Bảng thanh toán nền tảng | `apps/api/app/api/payments/route.ts:8-100` (không lọc `type`) | Gói đăng ký + thanh toán thủ công | Đợt `ORDER_PAYMENT` của mọi shop sẽ hiện, nhãn "Manual Payment" | Trung bình | test: route không trả ORDER_PAYMENT |
| Chi tiết đơn admin | `apps/admin/app/orders/[orderId]/page.tsx:66-67,89-90,...` (`totalPaid = Σ payments`) | Σ mọi Payment | Đợt tính vào `totalPaid` (đúng cho admin) | Thấp | — |
| Tóm tắt đơn (UI dùng chung) | `packages/ui/.../OrderDetail/order-money.ts:51`; `utils.ts:33,133`; `OrderSummary.tsx:66-74` | `còn lại = total − depositAmount` | Đúng với `depositAmount` giữ nghĩa mới; không hiện đợt (để sau) | Thấp | — |
| Bảng đơn | `packages/ui/.../Orders/components/OrderTable.tsx:409,497`; `Orders/utils.ts:142`; `ProductOrdersView.tsx:168` | Σ `depositAmount` làm "tổng cọc" | Số này giờ gồm cả đợt thu sớm: đổi nghĩa "tổng cọc" thành "đã thu trước khi giao" | Thấp | — |
| Form sản phẩm admin | `packages/ui/.../ProductForm.tsx:105` | FIXED/DAILY | Sửa SP khối ngày bằng admin có thể xoá option BLOCK nếu không giữ (cùng cơ chế #10) | Trung bình | test product-preserve cho admin |

### 2.3 iOS (`apps/mobile`)

Đường dẫn rút gọn: `ADBD/` = `apps/mobile/POS ADBD/`. Evidence là của tag app cũ trừ khi ghi khác.

| Screen/logic | Evidence | Hôm nay | Thay đổi/tác động | Rủi ro | Test |
|---|---|---|---|---|---|
| Giải mã chi tiết đơn | `ADBD/Model/Order.swift:604-643` (`payments: [Payment]`), `:969-976` `Payment`; `ADBD/Library/Services/BaseService.swift:270-310` (`JSONDecoder.shared.decode`); `ADBD/Utils/JSONHelper.swift:68-90` | Lỗi `keyNotFound(paymentMethod)` nếu có ≥1 Payment (mục 5) | App mới: thêm `installments` dạng optional, đổi `Payment` thành `method`/`processedAt` hoặc nhận cả hai | **Cao** | thêm test decode JSON thật có `payments` (fixture hiện chỉ có `payments:[]`: `ADBDTests/OrderDetailLogicTests.swift:323`) |
| "Thu khi giao" / balance | `ADBD/ViewModels/OrderDetailLogic.swift:49-55` (`due = total − deposit + thế chân − PICKUP`), `:203-237` | Dựa `depositAmount` + Payment `PICKUP` | Giữ nguyên; thêm khối tiến độ | Thấp | thêm case plan vào `OrderDetailLogicTests` |
| Giỏ: cọc | `ADBD/Model/Cart.swift:57-68` (`depositAmount` tự tính/ghi tay), `:70-80` | Cọc = Σ cọc mỗi món, sửa tay | "Theo đợt": ẩn ô cọc, hiện kế hoạch | Trung bình | `CartDepositTest`-tương đương Swift (`ProductsV2Tests` có 33 chỗ nhắc deposit) |
| Tạo đơn | `Cart.swift:880-935` `toCreateOrderRequest` | Gửi `totalAmount`, `depositAmount`, giá dòng | Thêm `paymentPlan`; BLOCK gửi giá server kiểm | Trung bình | UI test `AnyRentE2ETests` |
| Sửa đơn | `Cart.swift:396-399` (`setManualDepositAmount(orderDetail.depositAmount)`), `:800-860` (`toUpdateOrderRequest` gửi `totalAmount`, `depositAmount`) | Gửi lại cọc đang có và tổng tính cục bộ | App mới: không gửi `depositAmount` khi có kế hoạch; app cũ: server bỏ qua (spec) | Cao nếu server không bỏ qua / không tính lại BLOCK | test PUT app cũ |
| "Đã thu" khi sửa | `ADBD/Model/ProductsV2.swift:740-754`, `Cart.swift:448-450,644` | `payments == nil` → `deposit + totalPaid` | Trùng khi `totalPaid` gồm INSTALLMENT (#6) | Trung bình-Cao | test hai nguồn |
| Màn giao/trả | `ADBD/Viewcontrollers/OrderDetail/OrderHandOverSheetViewController.swift:39` | Chỉ `PUT status`, không Payment | App mới: gọi "thu đợt" cho phần còn lại rồi mới đổi trạng thái | Cao (#4) với app cũ | e2e hiển thị |
| Huỷ đơn | `ADBD/Library/Services/OrderService.swift:~612` `cancelOrder` → `PUT {"status":"CANCELLED"}` | Không có số giữ/hoàn | App mới: màn huỷ có chính sách + giữ/hoàn | Cao (#5) | e2e |
| Danh sách đơn/hàng | `ADBD/Model/Order.swift:209-210,433-436` (`paymentCount`, `totalPaid` `decodeIfPresent`) | Số do server | Chip đợt mới là trường optional | Thấp | decode test |
| Chia sẻ ảnh/QR | `ADBD/Model/OrderShareImage.swift:294-306` (`amountDue = total − deposit − PICKUP`), `:318,330-333`; `ADBD/Utils/OrderShareRenderer.swift` | VietQR theo số còn lại | Cũ: QR = toàn bộ còn lại (không theo đợt). Mới: thêm dòng "Đã thu x/y, đợt kế" | Thấp | `ADBDTests/OrderShareImageTests.swift` |
| In nhiệt | `ADBD/Library/Managers/PrinterManager.swift:837-838, 922-923` ("Deposit"/"Paid" = `depositAmount`) | Một dòng | Nhãn "Deposit" vẫn đúng nghĩa số; biên nhận từng đợt là mẫu mới | Thấp | in thử |
| Tổng quan | `ADBD/Model/OverviewDashLogic.swift:216-224, 316, 404-410` (đẳng thức hàng = thẻ), `:429-452` (`RelatedEventReason`, `default: nil`), `ADBD/Library/Services/APIResponse.swift:646-659` (`futureIncome`) | Server tính; hàng "còn phải thu" = `total − depositAmount` | Thêm `RENT_INSTALLMENT` vào `knownDescriptions`/`forType`; thẻ "Cần thu" | Trung bình | `ADBDTests/OverviewDashLogicTests.swift` (23 chỗ deposit), golden |
| Lịch/Hôm nay | `ADBD/Model/CalendarV2.swift:300-302` (`hidesMoney`), API `calendar/orders/by-date/route.ts:146-179` (`amountDue` server) | Server tính | Chip "Đợt trễ" | Thấp | — |
| Khách hàng | `ADBD/Model/CustomersV2.swift:235-238` | `hidesMoney` ẩn "đã chi" cho staff | Không đổi | Thấp | — |
| Nháp giỏ (offline) | `ADBD/Model/Cart.swift:268-286` `DiskSnapshot: Codable`; `ADBD/ViewModels/CartStore.swift:59-65, 229` (`UserDefaults`, `JSONDecoder().decode`) | Trường mới trước đây (`editOriginal`) là `= nil` | Mọi trường mới phải optional. Một trường bắt buộc mới → `decode` ném lỗi và **mất nháp** êm. Hạ cấp (mới → cũ) an toàn vì khóa lạ bị bỏ qua | Thấp-Trung bình | test: JSON nháp cũ giải mã bởi bản mới, và ngược lại |
| Push/Inbox | `ADBD/Library/Managers/PushNotificationManager.swift:150-190` (chạm push → `loadOrderDetail`) | Mở đơn từ push | Spec không thêm loại push. Nhưng đơn có Payment → lỗi giải mã (#1) | Cao nếu #1 chưa xử lý | e2e mở từ push |
| Giá khối ngày | `ADBD/Model/ProductsV2.swift:129-158`; `Cart.swift:800-823` (`isDailyPricing` → `qty×price×days`) | Giá FIXED/DAILY | Cũ: option BLOCK coi như "per rental" giá ngày 1; server tính lại (A) | Cao (tiền) nếu server không tính lại | golden chung `block-pricing-golden.json` |
| Quyền vai trò | `ADBD/ViewModels/OrdersHomeViewModel.swift:620` `hidesMoney(role:hideForStaff:)` | Staff thấy ít tiền theo cài đặt | Staff/INVENTORY: thu đợt tối đa phần còn lại; ẩn nút sửa % và hoàn; API là chốt | Trung bình | UI test theo vai trò |
| i18n | `en.lproj`, `vi-VN.lproj` (spec block-pricing) | 2 ngôn ngữ | Thêm khóa vào cả hai; web 5+ ngôn ngữ | Thấp | grep khóa thiếu |
| Trợ năng | thanh tiến độ, chip trễ hạn | — | Cần `accessibilityLabel` "Đã thu 50%, còn 6 triệu", không chỉ dùng màu đỏ; Dynamic Type cho dòng đợt | Thấp | UI test accessibility |

### 2.4 Android (`apps/mobile-android`)

Đường dẫn rút gọn: `A/` = `apps/mobile-android/app/src/main/java/com/anyrent/pos/`.

| Screen/logic | Evidence | Hôm nay | Thay đổi/tác động | Rủi ro | Test |
|---|---|---|---|---|---|
| Giải mã chi tiết đơn | `A/data/ApiClient.kt:1469, 1492-1498` (`optString("paymentMethod").ifBlank { optString("method") }`), `A/data/model/Models.kt:136-140,158-164` | **Dung nạp** cả hai tên trường (parse bằng `org.json`) | Không vỡ với INSTALLMENT; app mới thêm `installments` optional | Thấp | thêm test parse |
| "Thu khi giao" | `A/domain/orders/OrderDetailLogic.kt:23-28, 102-139` (`due = total − deposit + thế chân − PICKUP`) | Dựa `depositAmount` + `PICKUP` | Giữ nguyên | Thấp | `OrderDetailLogicTest.kt` thêm case plan |
| Giỏ: cọc | `A/data/CartStore.kt:87-94, 188-197` (`depositManual`, `autoDeposit`) | Như iOS | "Theo đợt": ẩn ô cọc | Trung bình | `CartDepositTest.kt` |
| Tạo/sửa đơn | `A/data/CartOrderSubmit.kt:43-45, 103-105` (`totalAmount = CartStore.totalAmount`, `depositAmount = CartStore.depositAmount`) | Gửi tổng cục bộ | Giống iOS (#3) | Cao (tiền) nếu server không tính lại | `CartOrderSubmitEditTest.kt` |
| Thu tiền hand-over | `A/data/repository/DefaultPaymentRepository.kt:23-43` (`POST /api/payments/process`, `notes = purpose`) | UI cũ (legacy) vẫn gọi; UI mới thì không (`HandOverReturnNoPaymentTest.kt:25`) | Với đơn có kế hoạch, `payments/process` kiểu `PICKUP` của app cũ có thể trùng với đợt: server phải phân bổ vào đợt chưa thu | Trung bình-Cao (#4) | test API: PICKUP vào đơn có kế hoạch |
| "Đã thu" khi sửa | `A/domain/orders/EditOrderSheet.kt:121-138` | `payments == null` → `booking + original.paid` | Trùng như #6; `CartStore.kt:431-433` truyền `paid = Σ payments` | Trung bình-Cao | `EditOrderSheetTest.kt` |
| Huỷ | `A/ui/orders/v2/OrderDetailV2Screen.kt:450` `changeStatus("CANCELLED")`; `OrderDetailV2ViewModel.kt:43-47` | Không số giữ/hoàn | #5 | Cao | e2e |
| Chia sẻ/in | `A/domain/orders/OrderShareModel.kt:97-117, 225-233` (`rentDue`); `A/print/ThermalPrinter.kt:184-185` | Như iOS | Như iOS | Thấp | `OrderShare*Test` |
| Tổng quan | `A/ui/overview/OverviewScreen.kt:567` (`realIncome + futureIncome`), `A/domain/overview/OverviewRelated.kt:95-140`, `OverviewLogic.kt:30-60, 306` | Cộng `futureIncome` vào doanh thu | Không được đưa số đợt vào `futureIncome` (sẽ cộng trùng) | Trung bình | golden income + test Android |
| Nháp giỏ | `A/data/CartStore.kt:119-131` (`SharedPreferences` + `runCatching { applyJson(JSONObject(raw)) }`) | `org.json` dung nạp khóa lạ/thiếu | `runCatching` nuốt lỗi → mất nháp êm nếu code mới ném; thêm khóa phải dùng `opt*` | Thấp | `CartCostPersistTest.kt` |
| Offline cache | `A/data/cache/OfflineCache.kt` | Lưu JSON đơn đã tải | Khóa mới bị bỏ qua; app mới đọc cache cũ thiếu `installments` → coi là không có kế hoạch | Thấp | test cache |
| Giá khối ngày | `A/domain/products/ProductRules.kt:84-100` (`PricingTypes.normalizeOption` giữ `BLOCK`, payload qua `normalize` thành `FIXED`), `:128-138` | BLOCK tách hàng riêng nhưng gửi `FIXED` | App mới phải gửi `BLOCK` + giá server kiểm; sửa `CartNullPricingTest.kt:82` có chủ đích | Trung bình | `CartBlockPricingTest.kt` mới |
| Push/Inbox | `A/push/DraftOrderReminder.kt`; `Models.kt` `InboxNotification(type: String)` | Loại push là chuỗi tự do | Không có loại push mới → không tác động | Thấp | — |
| Quyền | `domain/calendar/CalendarLogic.kt:132`, `domain/orders/EntityOrdersLogic.kt:42` (`hidesMoney`) | — | Như iOS | Trung bình | — |
| i18n | `res/values/strings.xml`, `res/values-vi/strings.xml` | 2 ngôn ngữ | Thêm cả hai | Thấp | lint thiếu chuỗi |
| Trợ năng | `contentDescription`, `semantics` cho thanh tiến độ/chip | — | Như iOS; TalkBack đọc "đợt 2, trễ 2 ngày" | Thấp | — |

### 2.5 Nháp, hàng đợi offline, tương thích tiến–lùi (tổng hợp)

| Kho | Cơ chế | Tiến (cũ→mới) | Lùi (mới→cũ) | Quy tắc |
|---|---|---|---|---|
| iOS nháp giỏ | `UserDefaults` + `Cart.DiskSnapshot` Codable (`Cart.swift:268-286`) | Nháp cũ thiếu khóa mới: OK nếu khóa mới là `Optional` | Khóa lạ bị bỏ qua: OK | Mọi trường mới `?`; viết test với JSON nháp lưu từ tag |
| Android nháp giỏ | `SharedPreferences` JSON (`CartStore.kt:119-131`) | `opt*` OK | OK | Không dùng `getXxx` ném lỗi |
| Hàng đợi offline đơn | Không tìm thấy hàng đợi gửi đơn bền ở cả hai app (chỉ `OfflineCache.kt` đọc). **Chưa kiểm chứng** là không có ở nơi khác | — | — | Nếu có: thêm `paymentPlan` phải optional |
| Web | Không có nháp bền trong `apps/client/app/orders/create` | — | — | — |

### 2.6 Test hiện có và test sẽ vỡ

| Test | Vì sao vỡ/cần sửa |
|---|---|
| `tests/api-compat/income-daily-api-compat.test.ts`, `income-orders-api-compat.test.ts`, `overview-api-compat.test.ts` (golden `income-*-main-real.json`) | Không được vỡ với đơn không kế hoạch (đó là mục đích). Cần golden mới cho đơn có kế hoạch, không sửa golden cũ |
| `tests/api/order-balance.test.ts`, `order-balance-batch.test.ts`, `order-deposits.test.ts` | Thêm case plan; cọc do server giữ |
| `tests/order-form-line-pricing.test.ts`, `tests/web-receipt-model.test.ts` | Dòng BLOCK, công thức `itemCalcText` |
| iOS `ADBDTests/OrderDetailLogicTests.swift` (fixture `payments:[]` ở `:323`) | Không bắt được lỗi #1; thêm fixture có payment |
| iOS `ADBDTests/ProductsV2Tests.swift` (33 chỗ deposit), `OverviewDashLogicTests.swift` (23), `HandOverCollateralTests.swift` (18) | Có thể vỡ khi ô cọc ẩn ở chế độ "Theo đợt"; chạy với chế độ mặc định `PRODUCT` thì không đổi |
| iOS `ADBDUITests/AnyRentE2ETests.swift` (`:957,1457,1523,3681`) | Bước nhập "Cọc" và nhãn "Cọc khi tạo đơn" vẫn chạy ở chế độ mặc định; thêm biến `E2E_FEATURES=installments` cho nhánh mới |
| Android `CartNullPricingTest.kt:82` | `PricingTypes.normalize` phải giữ BLOCK: sửa có chủ đích (spec block-pricing) |
| Android `CartDepositTest.kt`, `EditOrderSheetTest.kt`, `OrderDetailLogicTest.kt`, `CartOrderSubmitEditTest.kt`, `HandOverReturnNoPaymentTest.kt` | Thêm case plan; giữ case cũ |
| `tests/locales-valid-json` (theo AGENTS.md) | Chạy sau khi gộp `dev` |

### 2.7 i18n

- Web: spec liệt kê 5 locale (en, vi, ja, ko, zh), nhưng `locales/` có 12 thư mục (de, en, es, fr, id, ja, ko, ru, th, vi, zh-TW, zh). Cần chủ shop xác nhận 5 là đủ (AGENTS.md nói 5) và kiểm chỗ fallback cho 7 ngôn ngữ còn lại.
- Mobile: iOS `en.lproj` + `vi-VN.lproj`; Android `values` + `values-vi`. Không có ja/ko/zh trên mobile → câu mô tả `revenueType` mới phải có tiếng Việt chuẩn (xem #7).
- Mã lỗi mới (`INSTALLMENT_*`, `BLOCK_PRICE_MISMATCH`, `CANCEL_AMOUNTS_MISMATCH`) chỉ app mới hiểu. App cũ nhận 400 sẽ hiện `message` thô (Android ưu tiên `error`: `ApiClient.kt:1302-1325`). **Nguyên tắc:** không trả lỗi mới cho client không có header; server tự chỉnh êm (tính lại, bỏ qua `depositAmount`).

### 2.8 Trợ năng

Thanh tiến độ phải có nhãn đọc được ("Đã thu 50%, còn phải thu 6.000.000đ"); trạng thái trễ hạn không chỉ dùng màu; hàng đợt cần vùng chạm ≥44pt (iOS)/48dp (Android); Dynamic Type/ font scale không cắt số tiền; nhập tiền dùng bàn phím số có nhãn. Chưa thấy test trợ năng nào trong repo (chưa kiểm chứng sâu).

---

## 3. Ma trận tương thích

Giả định: đơn có kế hoạch gồm 2 đợt (50% thu khi tạo, 50% hạn trước ngày lấy); đơn khối ngày có sản phẩm BLOCK. "Cũ" = tag `release-2026-10-12.2` / tab web mở lâu. Hành vi dự kiến **sau khi áp dụng giảm thiểu**; cột "Nếu chưa giảm thiểu" nêu hậu quả thật.

Mức: C = Cao, TB = Trung bình, T = Thấp.

| # | Kịch bản | iOS cũ | Android cũ | Tab web cũ | Nếu chưa giảm thiểu | Mức | Giảm thiểu (server / app) |
|---|---|---|---|---|---|---|---|
| S1 | Mở chi tiết đơn có kế hoạch (≥1 Payment) | Lỗi giải mã `keyNotFound(paymentMethod)` (`Order.swift:969-976`); màn tải thất bại với thông báo lỗi parse | Mở được; `PaymentEntry` dung nạp (`ApiClient.kt:1492-1498`) | Mở được; bỏ qua notes lạ (`orders-model.ts:355-357`) | iOS không xem được đơn | C | Server: alias `paymentMethod`/`paymentDate` + ẩn INSTALLMENT khi không có header. iOS mới: `Payment` tolerant |
| S2 | Mở đơn từ push/in/chia sẻ/Tổng quan/Lịch | iOS: cùng `loadOrderDetail` (`PushNotificationManager.swift:193`, `PrinterManager.swift:1006`, `OverviewViewController.swift:1373`…) → cùng lỗi S1 | OK | OK | Nhiều ngã vào một lỗi | C | Như S1 |
| S3 | Danh sách đơn, Lịch, Hôm nay | OK: `amountDue` từ server (`calendar/orders/by-date/route.ts:146-179`); `totalPaid` có thể lệch | OK; `amountDue` từ `ApiClient.kt:1422` | OK | `totalPaid` gồm INSTALLMENT (#6) | TB | `totalPaid`/`paymentCount` loại INSTALLMENT cho client không header |
| S4 | Giao hàng khi còn đợt chưa thu | `PUT PICKUPED` không Payment → kế hoạch lệch (#4) | Như iOS (UI mới) | Gửi `PUT` tương tự | Đợt 2 mãi "chưa thu" dù đã giao và đã thu tiền mặt | C | Server tự đối soát khi chuyển `PICKUPED` (D1) + audit; app mới gọi "thu đợt" |
| S5 | Trả hàng | Công thức trả không đụng đợt (`RETURN_ADJUSTMENT`, thế chân) | Như iOS | Như iOS | Không lệch nếu S4 đã đối soát | T | — |
| S6 | Huỷ đơn có đợt đã thu | `PUT CANCELLED` không số giữ/hoàn → ghi hoàn toàn bộ, bỏ qua chính sách | Như iOS | Như iOS | Mất chính sách, doanh thu ngày huỷ âm toàn bộ | C | D2; cờ LEGACY; cảnh báo web; staff không đổi số giữ/hoàn |
| S7 | Sửa đơn có kế hoạch (đổi ngày, ghi chú, món) | Gửi `depositAmount` = số đang có (`Cart.swift:396-399, 846-847`) và `totalAmount` cục bộ | Gửi `CartStore.depositAmount`, `totalAmount` (`CartOrderSubmit.kt:44-45`) | Gửi `depositAmount` từ state (`create-model.ts:600`) | Server ghi đè cọc → lệch với tổng các đợt | C | Server bỏ qua `depositAmount` của client khi đơn có kế hoạch; đổi tổng → tính lại đợt chưa thu; trả số đúng |
| S8 | Tạo đơn mới có món khối ngày | Gửi giá ngày 1 (`unitPrice` = option price) | Như iOS (`CartOrderSubmit.kt:43`) | Gửi `FIXED` + giá ngày 1 (`create-model.ts:600-606`) | Đơn thấp hơn giá thật | C | Server tính lại không header (block-pricing mục 8); 201 trả tổng đúng |
| S9 | Sửa đơn có món khối ngày | `PUT` gửi `totalAmount` cục bộ → ghi đè (`[orderId]/route.ts:757`) | Như iOS | Như iOS | Mất tiền êm | C | Server tính lại dòng BLOCK ở PUT và giữ `pricingSnapshot` |
| S10 | Sửa sản phẩm khối ngày | Gửi chỉ FIXED/DAILY (`ProductsV2.swift:139-158`) → xoá BLOCK | Như iOS (`ProductRules.kt:128-138`) | Form cũ cùng tình trạng | Mất bảng giá | TB | Server giữ BLOCK khi không có `pricingSchemaVersion:2` |
| S11 | Xem/giỏ sản phẩm khối ngày | Hiện giá ngày 1; tổng giỏ sai so với đơn lưu | Như iOS | Như iOS | Nhân viên báo giá sai | TB | Phương án A + hướng dẫn; B nếu chủ shop muốn chặn |
| S12 | Tổng quan/Doanh thu | Số server; `revenueType` lạ → hiện `description` tiếng Việt (`OverviewDashLogic.swift:443-452`) | Cộng `futureIncome` (`OverviewScreen.kt:567`) | Số server | Cộng trùng nếu nhét đợt vào `futureIncome` | TB | `futureInstallments` riêng; giữ đẳng thức hàng = thẻ |
| S13 | Chia sẻ ảnh/QR/in | "Còn phải trả" = `total − deposit − PICKUP` (`OrderShareImage.swift:294-306`) | `rentDue` (`OrderShareModel.kt:229-233`) | Biên nhận 1 dòng "Đã cọc" | QR là toàn bộ còn lại, không theo đợt | T | Chấp nhận; app mới thêm tiến độ |
| S14 | Thu thêm bằng `payments/process` `PICKUP` trên đơn có kế hoạch (Android legacy) | — | Tạo Payment PICKUP không gắn đợt | — | Tính trùng `depositAmount` + PICKUP | TB-C | Server phân bổ vào đợt chưa thu; không bao giờ cho một khoản ở cả hai nơi |
| S15 | Nháp giỏ đang lưu khi nâng cấp/hạ cấp | OK nếu khóa mới optional | OK (`runCatching`) | Không có nháp bền | Mất nháp êm nếu trường bắt buộc | T | Test JSON nháp từ tag |
| S16 | Shop chọn "Theo đợt" nhưng nhân viên dùng app cũ tạo đơn | Đơn không có kế hoạch, cọc theo sản phẩm | Như iOS | Như iOS | Dữ liệu lẫn | TB | Không tự gán mẫu; báo cáo; thông báo cập nhật app |
| S17 | Admin xem thanh toán nền tảng | — | — | Admin `/api/payments` lẫn ORDER_PAYMENT | Sai bảng thanh toán | TB | Lọc `type` |
| S18 | Mở app mới với API chưa có tính năng (chỉ app, không API) | Trường optional vắng → ẩn UI | Như iOS | Web luôn đi cùng API | — | T | Cờ `installments` + chế độ `PRODUCT` mặc định |

---

## 4. Kế hoạch triển khai

### 4.1 Khóa `MOBILE_FEATURES`

- Hiện 9 khóa (`apps/api/lib/mobile-app-config.ts:11-21`); để trống = **bật tất cả**, `none` = tắt tất cả, danh sách = chỉ bật các khóa liệt kê (`:56-66`). Khóa không biết bị bỏ qua.
- Thêm `installments` và `blockPricing`. Vì "trống = bật hết", **phải đặt `MOBILE_FEATURES` tường minh trên Railway production trước khi phát hành** (đúng như ghi chú trong `spec.md` Rollout). Đề xuất: giữ nguyên danh sách hiện tại, không thêm hai khóa mới cho tới khi app mới lên store.
- Khóa chỉ điều khiển ẩn/hiện giao diện của **app mới**; nó không bảo vệ app cũ. Bảo vệ app cũ nằm ở server (header + alias + tính lại).
- UI "Theo đợt" luôn cần đồng thời: khóa bật **và** `Merchant.collectMode = INSTALLMENTS` (mặc định `PRODUCT`). Cờ shop phải nằm trong payload đăng nhập/hồ sơ (bài học #1138).

### 4.2 Thứ tự phát hành

| Bước | Nội dung | Điều kiện sang bước sau | Nếu dừng ở đây |
|---|---|---|---|
| 0 | PR hạ tầng (D3): alias `paymentMethod`/`paymentDate` trong `payments[]`, đọc `X-Client-Capabilities`, lọc `totalPaid`, lọc `/api/payments`. Vào `dev` → verify trên dev-api bằng build tag `release-2026-10-12.2` (iOS mở đơn có Payment) → `main-real`. Ghi `LOG.md` + `api-compat-review` | iOS cũ mở được đơn có Payment trên dev-api | Sửa luôn lỗi cũ; không đổi nghiệp vụ |
| 1 | API lõi (PR 1-2): migration additive, mẫu, kế hoạch, thu đợt, huỷ giữ/hoàn, server tính block, doanh thu đơn có kế hoạch. Chế độ mặc định `PRODUCT` | golden đơn cũ không đổi (2 TZ); e2e app cũ | Không ai thấy gì mới: không có mẫu, không có đơn BLOCK; API chỉ thêm trường tùy chọn |
| 2 | iOS mới rồi Android mới (PR 4-5), cờ tắt | App mới lên store, theo dõi tỉ lệ cập nhật | Hiện không có UI vì `collectMode=PRODUCT` |
| 3 | Web (PR 3) ở **cuối**: bật mục "Cách thu cọc" và tạo mẫu | Tỉ lệ nhân viên dùng app mới đủ (ngưỡng do chủ shop chọn) hoặc shop thử nghiệm đã được dặn | Nếu web ra trước mobile, shop có thể bật "Theo đợt" trong khi nhân viên còn app cũ → S4, S6, S7, S16 |
| 4 | Giá khối ngày: tách lịch riêng sau bước 1 (migration + `computeBlockPrice` + server tính lại) | Test PUT/POST app cũ | — |

Thứ tự đề xuất: **API (0 rồi 1) → iOS → Android → web bật cài đặt**; shop thử nghiệm bật bằng cờ riêng trước khi mở cho mọi shop. Theo bộ nhớ dự án: nhánh từ `origin/dev`, verify trên dev-api, lên main-real chậm; PR vào `main-real` kèm issue đánh giá rủi ro cho khách cũ.

### 4.3 Nếu chỉ phát hành API

An toàn nếu bước 0 đã có và chế độ mặc định `PRODUCT`: không có route nào đổi hành vi cho client hiện tại; các trường mới là bổ sung. Rủi ro còn lại: tải thêm truy vấn tiến độ ở `outlet-operations` (theo dõi thời gian phản hồi) và việc `PUT` bỏ qua `depositAmount` chỉ áp dụng khi đơn có kế hoạch (không có → không đổi).

### 4.4 Hỗ trợ, tài liệu, nội dung hướng dẫn

- Văn bản trợ giúp trong app/web: "Cách thu cọc" (hai lựa chọn, đổi chỉ ảnh hưởng đơn tạo sau), "Thu theo tiến độ" (đợt, hạn, thu đợt, biên nhận), "Huỷ đơn và chính sách", "Giá theo khối ngày".
- Tài liệu cho nhân viên hỗ trợ: cách xem phiên bản app của khách; cách đọc cờ `LEGACY_CLIENT` trên đơn; script "đơn không mở được trên iPhone" (trước bước 0 xảy ra nếu bất kỳ đơn nào có Payment).
- Thông báo cập nhật app: dùng `latestVersion` (đã có trong `mobile-app-config.ts`) làm thông báo mềm; không nâng `minVersion` (D5).
- Hướng dẫn: `docs/` chưa có hướng dẫn sử dụng cho tính năng đơn hàng (chỉ có `docs/blog/anyrent-complete-feature-guide.md`); cần bài mới, có ảnh minh hoạ, bản 5 ngôn ngữ (xem skill `translate-post` trong bộ nhớ dự án).
- Nội dung bài đăng/video cần giữ thứ tự: vấn đề → thương hiệu → tính năng (theo ghi chú marketing của chủ shop).

### 4.5 Danh sách go / no-go

No-go nếu còn một mục chưa đạt:

- [ ] Bước 0 đã lên `main-real`, và build tag `release-2026-10-12.2` mở được đơn có Payment trên dev-api (đã có script chứng minh lỗi; cần chạy lại bằng app thật).
- [ ] Header `X-Client-Capabilities` có test: không header = hành vi hôm nay cho `payments[]`, `totalPaid`, tính giá khối.
- [ ] `PUT` từ app cũ trên đơn có kế hoạch: `depositAmount` bị bỏ qua, tổng đúng, đợt đã thu giữ nguyên (test API).
- [ ] `PUT`/`POST` từ app cũ trên đơn BLOCK: tổng do server tính, `pricingSnapshot` giữ nguyên.
- [ ] Giao hàng từ app cũ khi còn đợt chưa thu: đối soát tự động, audit, doanh thu khớp (D1).
- [ ] Huỷ từ app cũ: hành vi đã chốt (D2), cờ LEGACY, cảnh báo web.
- [ ] Golden doanh thu: đơn cũ không đổi (`TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`); golden mới 2 đợt, 3 đợt, cùng ngày, huỷ có giữ, đổi tổng sau khi thu, thế chân, gia hạn (#505).
- [ ] Đẳng thức Tổng quan: hàng = thẻ ở web, iOS, Android với dữ liệu có kế hoạch.
- [ ] `futureIncome` không đổi nghĩa; `futureInstallments` có và app cũ không dùng.
- [ ] Admin `/api/payments` không trả `ORDER_PAYMENT`.
- [ ] Nháp giỏ cũ giải mã được bởi bản mới (test JSON lưu từ tag).
- [ ] `MOBILE_FEATURES` production đặt tường minh; cờ shop nằm trong payload đăng nhập.
- [ ] `locales-valid-json` xanh sau gộp `dev`; khóa 5 locale web + 2 ngôn ngữ mobile.
- [ ] e2e hiển thị (Chrome headed, Simulator có cửa sổ, AVD có cửa sổ): tạo đơn 2 đợt → thu đợt 1 → mở bằng app cũ → thu đợt 2 bằng app mới → huỷ đơn khác.
- [ ] Dòng `.agent/api-changes/LOG.md` và bảng `## API compatibility` ở mỗi PR; issue rủi ro khách cũ gắn vào PR `main-real`.
- [ ] Quyết định D1-D7 đã ghi vào issue.

---

## 5. Kiểm chứng thực nghiệm: iOS cũ giải mã `payments[]`

**Mục tiêu:** xác nhận nghi vấn `Order.swift:969-976` (plan.md "Bước 0").

**Cách làm (không build app):**
1. Lấy hình dạng JSON thật từ code API: `packages/database/src/order.ts` `findByIdDetail` (`:2064`, `payments.select` ở `:2210-2224` chọn `id, amount, method, status, reference, notes, processedAt, createdAt, updatedAt`); route `GET /api/orders/[orderId]` chỉ bọc lại (không đổi tên trường, `[orderId]/route.ts:233-340`); prisma `model Payment` (`prisma/schema.prisma:489`) có `method`, không có `paymentMethod`/`paymentDate`.
2. Sao nguyên văn `struct Payment: Codable` từ tag `release-2026-10-12.2` (`Order.swift:969-976`; cũng giống hệt trên `origin/main-real` và `origin/dev`) và bộ giải mã ngày `JSONDecoder.shared` (`JSONHelper.swift:68-90`) vào script `/private/tmp/claude-501/-Users-trinhtran-Documents-Source-Code-rentalshop-nextjs/71cdf13b-e5e1-4b05-b77b-fa169bf14132/scratchpad/swiftcheck/main.swift`, biên dịch bằng `swiftc` (Apple Swift 6.2.3, đĩa trống 16 GB) và chạy.

**Kết quả:**

```
A empty payments: OK payments=0
B API shape (method/processedAt): FAIL DecodingError.keyNotFound: Key 'paymentMethod' not found ... Path: payments[0]
C hypothetical alias (paymentMethod/paymentDate added): OK payments=1
```

**Diễn giải:**
- Hình dạng API thật (B) làm `decode` thất bại ở `payments[0]`; `BaseService.handleResponse` rơi vào nhánh lỗi parse (`BaseService.swift:~296-310`), `loadOrderDetail` trả `error` và màn chi tiết không hiển thị đơn.
- Đơn không có Payment (A) giải mã bình thường — vì thế lỗi chưa lộ: iOS không có call site tới `payments/process` (`APIEndpoint.swift:102-103` chỉ khai báo hằng), web không gọi, Android chỉ UI legacy; fixture test cũng chỉ có `payments:[]` (`OrderDetailLogicTests.swift:323`).
- Thêm alias (C) đủ để iOS cũ giải mã, nên giảm thiểu rẻ và độc lập với thiết kế đợt.
- `paymentDate` phải **luôn có giá trị** dạng ISO-8601 (lấy `processedAt ?? createdAt`), vì `Date` không optional.

**Giới hạn của phép thử:** chỉ kiểm chứng struct `Payment` và bộ giải mã ngày, không chạy toàn bộ `OrderDetail` (nhiều kiểu phụ thuộc). Phần còn lại của `OrderDetail` không liên quan tới khóa bị thiếu nên kết luận về `payments[0]` vẫn đứng. Vẫn nên chạy lại bằng build app thật (plan.md Bước 0) để chốt trước khi tuyên bố trong issue.

---

## 6. Các nhận định chưa kiểm chứng

1. Chạy app iOS/Android thật trên Simulator/AVD với đơn có Payment: **chưa kiểm chứng** (chỉ có script Swift cho `Payment`; Android chỉ đọc code `ApiClient.kt:1469-1498`).
2. Hành vi hiển thị cụ thể khi iOS gặp lỗi parse (thông báo gì, có quay lại màn trước không): **chưa kiểm chứng**; chỉ đọc `BaseService.swift` và các call site.
3. Việc production hiện đang có đơn nào mang Payment hay không (nếu có, một số shop iOS đã gặp lỗi này): **chưa kiểm chứng** (không đọc dữ liệu production, theo quy tắc dự án).
4. Có hàng đợt offline gửi đơn nào ngoài `OfflineCache.kt` / nháp giỏ: **chưa kiểm chứng** (chỉ tìm theo tên file và grep).
5. Android màn legacy (`PaymentCollectionSheet`) có còn truy cập được trong bản đã cài không (tùy cờ `newOrderDetail`): **chưa kiểm chứng**; ảnh hưởng mức độ S14.
6. Phiên bản app đang cài trên thiết bị khách và tỉ lệ cập nhật: **chưa kiểm chứng** (không có số liệu; "installed apps" lấy từ tag `release-2026-10-12.2` theo AGENTS.md; `origin/main-real` còn 647 commit sau tag, nhưng `Payment` struct không đổi).
7. Nền tính đợt có gồm `loyaltyDiscount` hay không (D6) và gia hạn `pickupTotalAmount` (#505): chưa đọc hết `apps/api/app/api/orders/[orderId]/route.ts` ở nhánh gia hạn; **chưa kiểm chứng**.
8. `X-Client-Capabilities` không tồn tại trong `origin/dev` — dựa trên `git grep` toàn `apps` và `packages`; có thể có tên khác cho cùng ý (không thấy).
9. Tác động tới thống kê nền tảng (admin dashboard doanh thu gói) ngoài `/api/payments`: **chưa kiểm chứng**; chỉ thấy `packages/database/src/payment.ts` và `subscription.ts` có truy vấn Payment chung, chưa rà từng cái.
10. Trợ năng và hiệu năng truy vấn `outlet-operations` mới: chưa đo.
11. Số liệu doanh thu trong tài liệu này là phân tích mã, không phải chạy golden; việc chạy `tests/api-compat/*` sau khi code xong là bắt buộc.
