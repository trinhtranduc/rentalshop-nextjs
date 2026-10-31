# Spec — Biến thể sản phẩm

Issue: #1305 · Status: draft · Intent: ./intent.md

Tài liệu này chỉ mô tả; chưa có mã. So sánh app cũ với tag `release-2026-10-12.2` (bản mới nhất trên `origin/main-real`). Số dòng `file:line` của code hiện tại lấy trên `origin/dev` ngày 2026-10-28; số dòng của app cũ lấy bằng `git show origin/main-real:<path>`.

## 1. Mục tiêu và không-mục-tiêu

### Mục tiêu (giai đoạn 1)

- G1. Một sản phẩm có nhiều **biến thể**; mỗi biến thể có tên (ví dụ "M / Đỏ"), SKU tuỳ chọn, bật/tắt, và tồn kho theo từng chi nhánh.
- G2. Tạo đơn (web, iOS, Android) chọn được biến thể; còn trống tính theo biến thể, theo chi nhánh, theo ngày dân sự Việt Nam.
- G3. Dòng đơn lưu snapshot biến thể; lịch sử không đổi khi sửa hay xoá biến thể.
- G4. Sản phẩm không có biến thể và mọi app cũ chạy như hôm nay.
- G5. Trang công khai hiển thị tên các biến thể (chỉ để xem).

### Không-mục-tiêu (giai đoạn 1)

- Không làm **tài sản cụ thể** (từng chiếc có QR / mã riêng, hao mòn, lịch sử từng chiếc). Xem mục 2.
- Không có bảng thuộc tính (Size, Màu là danh mục riêng). Biến thể chỉ có một ô tên tự do.
- Không giá riêng theo biến thể (kế thừa sản phẩm). Xem câu hỏi 1.
- Không ảnh riêng theo biến thể, không tìm bằng ảnh theo biến thể. Xem câu hỏi 5.
- Không nhập / xuất biến thể bằng file (import / export giữ như cũ).
- Không báo cáo doanh thu / top sản phẩm tách theo biến thể.
- Không đặt thuê online theo biến thể trên trang công khai. Xem câu hỏi 6.
- Không đổi `admin` (trang quản trị hệ thống).
- Không chuyển kho giữa chi nhánh, không kiểm kê theo biến thể.
- Không đổi quy tắc ngày, cọc, trạng thái đơn.

## 2. Thuật ngữ

| Từ | Nghĩa trong spec này |
|---|---|
| Sản phẩm (`Product`) | Một mẫu để cho thuê hoặc bán, ví dụ "Váy cưới A". Có ảnh, giá, cọc, mô tả. |
| **Biến thể** (`ProductVariant`) | Một lựa chọn của sản phẩm, ví dụ "M / Đỏ". Cùng ảnh và cùng giá với sản phẩm. Có tồn kho riêng. **Đây là phần giai đoạn 1 làm.** |
| **Tài sản cụ thể** | Một chiếc váy thật có mã QR riêng, biết chiếc nào đang ở đâu. **Không làm ở giai đoạn 1.** Mô hình dữ liệu sau này (`Asset` thuộc biến thể hoặc sản phẩm) không bị biến thể chặn lại: `OrderItem.variantId` nằm cạnh một `assetId` có thể thêm sau. |
| SKU | Mã nội bộ của biến thể (ví dụ `VA-M-DO`). Tuỳ chọn. Khác `Product.barcode` (mã vạch của cả sản phẩm, `schema.prisma:273`, duy nhất theo shop `schema.prisma:296`). |
| Sản phẩm có biến thể | Sản phẩm có ít nhất một biến thể đang bật (`isActive` và chưa xoá). |
| Dòng chưa chọn biến thể | `OrderItem.variantId = null` của một sản phẩm có biến thể (đơn tạo từ app cũ). |
| App cũ / client có khả năng | App không / có gửi `X-Client-Capabilities: variants` (`client-capabilities.ts:4-8`). |

## 3. Hiện trạng trong code (đã đọc)

### 3.1 Mô hình

| Chủ đề | Hiện trạng | Nguồn |
|---|---|---|
| Product | `totalStock`, `rentPrice`, `salePrice?`, `deposit`, `images Json?`, `barcode?` duy nhất theo shop, `pricingType?`, xoá mềm `deletedAt`. Khoá chính `Int` tự tăng (AGENTS.md nói CUID, schema thật dùng `Int`; id mới theo cùng kiểu `Int` như `Product`). | `prisma/schema.prisma:269-303` |
| Giá thuê | `ProductPricingOption`: `FIXED` / `DAILY` / `BLOCK` (+ `blockTiers`, `blockStartDay`, `blockExtraMode`, `blockExtraPrice`), `isDefault`, `isActive`. | `schema.prisma:305-326` |
| Tồn kho | `OutletStock` duy nhất theo `(productId, outletId)`: `stock`, `available`, `renting`. `Product.totalStock` = tổng `stock` của các chi nhánh (`syncProductTotalStock`). | `schema.prisma:350-364`, `packages/database/src/product.ts:774-860` |
| Dòng đơn | `OrderItem`: `productId?`, snapshot `productName`, `productBarcode`, `productImages`, `pricingType`, `pricingOptionId`, `pricingSnapshot`, `deposit` (mỗi đơn vị), `rentalDays`. Chỉ mục `[orderId, productId]`. | `schema.prisma:481-501` |
| Add-on | `AddonPrice` / `PlanLimitAddon` là gói mở rộng của **gói dịch vụ AnyRent** (thêm người dùng, chi nhánh...), không phải phụ kiện của sản phẩm. Không liên quan biến thể. | `schema.prisma:714-736` |
| Yêu cầu đặt online | `BookingRequestItem`: `productId`, `productName`, `unitPrice`. | `schema.prisma:1420-1431` |

### 3.2 Tồn kho và còn trống

- Cập nhật tồn khi đổi trạng thái đơn: `updateOutletStockForOrder(orderId, oldStatus, newStatus, orderType, outletId, orderItems[{productId, quantity}])` (`product.ts:925-1100`). RENT: `RESERVED` → `PICKUPED` tăng `renting`; `RETURNED` / `CANCELLED` giảm `renting`. SALE: `COMPLETED` giảm `stock`. Gọi từ `apps/api/app/api/orders/route.ts:1287-1311` (tạo đơn) và `packages/database/src/order.ts:744-751` (đổi trạng thái).
- Sửa dòng khi hàng đang ở ngoài (#504): `adjustOutletStockForEditedOrderItems` ghép dòng theo `productId` (`product.ts:1110-1145`), gọi ở `order.ts:714-725`.
- Còn trống theo ngày: `apps/api/lib/availability.ts` — `aggregateConflictingQuantities(productId, outletId, orders)` cộng số lượng các dòng trùng lịch theo `item.productId` (`availability.ts:103-141`); `resolveTotalAvailableStock` (`availability.ts:63-72`). Các route dùng nó: `apps/api/app/api/products/[id]/availability/route.ts:411,449`, `.../[id]/availability-calendar/route.ts:121,156-163`, `apps/api/app/api/products/batch-availability/route.ts`, `apps/api/app/api/products/availability/route.ts:417`. Trang công khai: `loadProductDays` trong `apps/api/lib/booking-requests.ts:166-215` và `apps/api/app/api/public/[tenantKey]/availability/route.ts`.
- Ngày: `apps/api/lib/availability-calendar-days.ts:1-40` (`toAvailabilityCivilDateKey`, `occupiedDateKeysForRange`; ngày lấy và ngày trả đều chiếm chỗ, cùng ngày vẫn chiếm 1 ngày).
- Chặn trùng lịch (#518, bật theo shop): `apps/api/lib/schedule-conflict-check.ts:60-140` đọc `OutletStock.stock` và các dòng đơn theo `productId`; `apps/api/lib/schedule-conflict.ts:65-163` gom theo `productId`.

### 3.3 Nơi đọc / ghi sản phẩm trong đơn

| Nơi | Hiện trạng | Nguồn |
|---|---|---|
| Tạo đơn (zod) | `orderItemSchema` là `z.object` không `strict`: key lạ bị bỏ. Có `productId`, `quantity`, `unitPrice`, `deposit`, `pricingType`, `pricingOptionId`. | `packages/utils/src/core/validation-schemas.ts:334-348` |
| Tạo đơn (API) | Giá và cọc **lấy từ request** (client tính); server chỉ kiểm lại dòng BLOCK. Snapshot `productName` / `productBarcode` / `productImages` từ sản phẩm. | `apps/api/app/api/orders/route.ts:847-966` |
| Trả đơn | Dòng đơn trả về `productName`, `productBarcode`, `productImages` ưu tiên snapshot. | `orders/route.ts:1380-1400`, `apps/api/app/api/orders/[orderId]/route.ts:309-319,1099-1126`, `.../by-number/[orderNumber]/route.ts`, `apps/api/app/api/calendar/orders/route.ts:137-159`, `.../by-date/route.ts:182-204`, `apps/api/app/api/customers/[id]/orders/route.ts:188` |
| Sửa đơn | `PUT /api/orders/[orderId]` thay toàn bộ dòng (`deleteMany` rồi `create`, `order.ts:623-645`). Với client cũ không gửi trường mới, server **giữ lại** `rentalDays`, `pricingType`, `pricingOptionId` của dòng cũ ghép theo `productId` (`orders/[orderId]/route.ts:750-775`). Đây là chỗ mẫu để giữ `variantId`. | như bên |
| Lấy / trả hàng | Qua đổi trạng thái đơn → `updateOutletStockForOrder`. | mục 3.2 |
| Nhiều giỏ | Web: giỏ nhiều tab, dòng ghép theo `key` rồi theo `productId` (`apps/client/app/orders/create/cart-store.ts:130-134`, `create-model.ts:51,145,215`). iOS: mỗi lần thêm là dòng mới với `lineId`, vẫn nhóm giá theo `productId` (`apps/mobile/POS ADBD/Model/Cart.swift:119-127`). Android: `CartLine.lineId` (#951). | như bên |
| Lịch trống | iOS `products.detail.freeCalendar` ("Lịch trống"): `ProductCalendarViewController.swift:109`, `ProductDetailViewController.swift:397`. Android `v2_detail_free_calendar`: `res/values-vi/strings.xml:607`. API: `availability-calendar`. | như bên |
| Báo cáo | Top sản phẩm gom theo `productId:outletId`, bỏ `CANCELLED`. | `packages/utils/src/analytics/period-report.ts:282-340`, `apps/api/app/api/analytics/top-products/route.ts` |
| In phiếu | Web `ReceiptPreviewModal.tsx:389-400` (`productName` + ghi chú). iOS `PreviewViewController.swift` (`OrderItemForPDF`), `PrinterCommand.swift`. Android `print/ThermalPrinter.kt:247`. | như bên |
| Trang công khai | `toPublicProduct` chỉ cho phép một danh sách field (`apps/api/lib/public-product.ts:1-60`); trang `apps/client/app/[tenantKey]/products`. Đặt online: `booking-requests/route.ts:27,82,118-122`. | như bên |
| Import / export | `bulk-import/route.ts:163-207` tạo 1 dòng tồn cho 1 chi nhánh; `export/route.ts:100-145` mỗi chi nhánh một dòng. | như bên |
| Tìm kiếm | `searchProducts` (`product.ts:232-340`) theo tên / barcode. Tìm bằng ảnh: điểm Qdrant theo `productId:imageIndex` (`packages/database/src/ml/vector-store.ts:40`), kết quả trả về theo sản phẩm (`searchByImage/route.ts:219-234`). | như bên |
| Barcode | `Product.barcode` duy nhất theo shop (`schema.prisma:296`); form tự sinh 11 số (#994). | `.agent/changes/994-auto-product-barcode/spec.md` |

### 3.4 App cũ trên `main-real` (release-2026-10-12.2)

| App | Cách đọc | Điều gì xảy ra khi thêm biến thể |
|---|---|---|
| iOS | `OrderItem: Codable` có `productName: String` (không optional), `productId?`, `pricingOptionId?` và không có field biến thể (`Model/Order.swift:782-822`). Product Codable (`Model/Product.swift:81-`) giải mã `outletStock` và `pricingOptions` bằng `try?`/`decodeIfPresent`. `JSONDecoder` mặc định bỏ qua key lạ. | Thêm key mới: không vỡ. Thêm `variants[]` vào product: bỏ qua. Nhưng app cũ **không hiện được size**, và gửi đơn **không có `variantId`**. Nếu server đổi `productName` thành null hoặc đổi kiểu thì vỡ giải mã đơn: giữ `productName` là chuỗi không rỗng. |
| Android | Đọc bằng `org.json` theo từng key: `parseOrderItem` (`data/ApiClient.kt:1638-1643`), `OrderItem` / `CartLine` / `Product` (`data/model/Models.kt:51,130-141,238-251`), gửi `productId` ở `ApiClient.kt:570,662` và `CartStore.kt:947`. | Key lạ bị bỏ qua. Cùng hạn chế: không hiện, không gửi biến thể. |
| Web tab cũ | `orderItemSchema` ở server bỏ key lạ; tab cũ không gửi `variantId`. | Như app cũ. |
| Header | Hai app cũ **không** gửi `X-Client-Capabilities` (`client-capabilities.ts:5-7`; trên `main-real` không có tham chiếu). Bản dev gửi: iOS `Model/DepositPlan.swift:18`, Android `domain/deposit/DepositPlan.kt:25`; CORS đã cho phép `apps/api/lib/cors-edge.ts:35`, `cors.ts:71`. | Dùng đúng cơ chế này, thêm token `variants`. |
| Mẫu đã làm | `apps/api/lib/block-pricing-legacy.ts:1-60`: client không có token nhận dữ liệu như cũ, client có token nhận dữ liệu mới (`productForClient`). | Làm cùng kiểu: `productForClient` thêm biến thể chỉ khi có token. |

Điều sẽ vỡ nếu làm sai (và cách tránh):

1. Server bắt buộc `variantId` cho mọi client → app cũ không tạo được đơn cho sản phẩm có biến thể (HTTP 400 mà app cũ không hiểu). **Tránh:** `variantId` bắt buộc chỉ với client có token `variants`.
2. App cũ sửa đơn gửi lại dòng không có `variantId` → mất biến thể và lệch tồn. **Tránh:** giữ `variantId` của dòng cũ khi client cũ sửa (mục 6.4).
3. App cũ sửa sản phẩm có biến thể và gửi `totalStock` / `outletStock[].stock` → làm tổng tồn lệch tổng biến thể. **Tránh:** mục 6.2.
4. Đơn / phiếu in của app cũ không hiện size → nhân viên giao nhầm size. **Tránh:** với client không có token, response đơn nối tên biến thể vào `productName` (mục 6.5). Đây vẫn là rủi ro lớn nhất (mục 11).
5. Còn trống: app cũ gọi `availability` theo sản phẩm → vẫn nhận số tổng đúng (mục 7).

## 4. Mô hình dữ liệu đề xuất

Tất cả là thêm mới: không đổi, không xoá cột hay bảng nào đã có.

### 4.1 Bảng mới `ProductVariant`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `Int` tự tăng | id ngoài, giống `Product` |
| `productId` | `Int` | FK `Product`, `onDelete: Cascade` |
| `merchantId` | `Int` | sao chép từ sản phẩm để SKU duy nhất theo shop; FK `Merchant` |
| `name` | `String` | "M / Đỏ". Ô tự do, 1-60 ký tự |
| `sku` | `String?` | duy nhất theo `(merchantId, sku)` khi có giá trị |
| `sortOrder` | `Int` default 0 | |
| `isActive` | `Boolean` default true | tắt = ẩn khi chọn, đơn cũ vẫn đọc được |
| `deletedAt` | `DateTime?` | xoá mềm như sản phẩm (#389) |
| `createdAt`, `updatedAt` | `DateTime` | |

Chỉ mục: `[productId, isActive]`, `@@unique([merchantId, sku])`. Tên trong cùng sản phẩm không được trùng khi đang bật (kiểm ở API, không ràng buộc DB vì có xoá mềm).

### 4.2 Bảng mới `VariantStock`

Giống `OutletStock` nhưng theo biến thể:

| Cột | Kiểu |
|---|---|
| `id` | `Int` tự tăng |
| `variantId`, `outletId` | `Int`, FK, `@@unique([variantId, outletId])` |
| `stock`, `available`, `renting` | `Int` default 0 |
| `createdAt`, `updatedAt` | `DateTime` |

Vì sao bảng riêng mà không thêm `variantId` vào `OutletStock`: `OutletStock` có `@@unique([productId, outletId])` và khoá `productId_outletId` được dùng khắp nơi (`product.ts:800-805,965-972,1127-1131`, `schedule-conflict-check.ts`, `booking-requests.ts:166`). Đổi khoá đó làm vỡ code cũ trên schema mới.

### 4.3 Cột mới trên `OrderItem` (đều nullable)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `variantId` | `Int?` | FK `ProductVariant`, `onDelete: SetNull` |
| `variantName` | `String?` | snapshot tên lúc tạo đơn |
| `variantSku` | `String?` | snapshot SKU |

Chỉ mục mới: `[productId, variantId]`. Cũng thêm `BookingRequestItem.variantId?` / `variantName?` chỉ ở giai đoạn 2 (mục 12).

### 4.4 Bất biến tồn kho (điều làm cho code cũ vẫn đúng)

- `OutletStock` **vẫn là tổng** cho mọi sản phẩm. Với sản phẩm có biến thể: `OutletStock.stock = Σ VariantStock.stock` theo chi nhánh, `Product.totalStock = Σ OutletStock.stock`. Cập nhật trong cùng transaction với `VariantStock`.
- `OutletStock.renting` gồm cả dòng chưa chọn biến thể. Nên `Σ VariantStock.renting ≤ OutletStock.renting`.
- `available` của biến thể = `stock - renting`, như `OutletStock` (`product.ts:865-915`).
- Nhờ vậy mọi chỗ đọc `totalStock`, `outletStock[]`, `available` (list sản phẩm, báo cáo, app cũ) vẫn đúng mà không biết biến thể.

### 4.5 Migration (skill `db-migration`)

- Một migration mới `product_variants`: tạo 2 bảng, thêm 3 cột nullable và chỉ mục. Không `NOT NULL` không default, không khoá bảng lớn (`OrderItem` chỉ `ADD COLUMN` nullable; chỉ mục tạo `CREATE INDEX` thường, chấp nhận ở quy mô hiện tại; nếu `OrderItem` lớn thì tạo `CONCURRENTLY` trong migration riêng).
- Không backfill: sản phẩm hiện có không có hàng `ProductVariant`.
- Code cũ chạy trên schema mới: không cột mới nào bắt buộc; `prisma.orderItem.create` cũ vẫn hợp lệ.
- Rollback: bỏ code, giữ bảng (bảng trống vô hại). Không `DROP` trong migration.
- Khi chạy: `yarn db:migrate:dev --name product_variants`, đọc SQL, `yarn db:generate && yarn type-check`. Dev trước, production là quyết định của người (hook chặn).

## 5. Quy tắc giá và cọc

Mặc định: **biến thể kế thừa hoàn toàn** `rentPrice`, `salePrice`, `deposit`, `pricingOptions` (kể cả BLOCK) của sản phẩm. Không có cột giá trên `ProductVariant`.

Vì sao:

- Server tin giá do client gửi và chỉ kiểm lại dòng BLOCK (`orders/route.ts:847-966`); cọc theo từng đơn vị, tính ở client. Không đụng đường giá nghĩa là không có chỗ nào của app cũ tính sai.
- Ghi đè giá cắt ngang giá BLOCK (#1189: bảng giá theo khối ngày, `blockTiers`) và cọc theo giai đoạn (#1199). Một "giá chênh" cho biến thể không có nghĩa rõ trên bảng khối ngày.
- `OUTLET_STAFF` không sửa giá (AGENTS.md): thêm nơi nhập giá là thêm nơi phải khoá.

Nếu chủ shop cần giá riêng (câu hỏi 1): giai đoạn 2 thêm `ProductVariant.rentPrice?`, `salePrice?`, `deposit?` (null = kế thừa). Ghi đè chỉ áp dụng cho sản phẩm không có option BLOCK; API client cũ không thấy giá biến thể nên không dùng chúng. Dòng đơn vẫn lưu `unitPrice` cuối cùng, nên lịch sử không đổi.

## 6. Hành vi API

Quy ước: token mới `variants` thêm vào `ClientCapability` (`client-capabilities.ts:15`). "Client có token" = gửi `X-Client-Capabilities: variants`. Tất cả field mới là thêm; field cũ giữ nguyên nghĩa.

### 6.1 Đọc sản phẩm

- `GET /api/products`, `GET /api/products/[id]`, `GET /api/merchants/[id]/products` (`apps/api/app/api/products/route.ts:56`, `[id]/route.ts`): client có token nhận thêm `hasVariants: boolean` và `variants: [{ id, name, sku, isActive, sortOrder, stock, available, renting, outletStock?: [{ outletId, stock, available, renting }] }]`. Danh sách trả `stock/available/renting` theo `outletId` đang lọc; chi tiết trả đủ các chi nhánh người dùng thấy (cùng quy tắc phạm vi như `outletStock` hiện có).
- Client không có token: response **giống hệt** hôm nay. `totalStock`, `outletStock[]`, `available` là tổng (mục 4.4).
- `GET /api/public/[tenantKey]/products`: `toPublicProduct` thêm `variants: [{ id, name }]` vào allowlist (`public-product.ts`), không SKU, không tồn kho. Tab web cũ bỏ qua key lạ.
- Tìm kiếm: `searchProducts` khớp thêm `ProductVariant.sku` và `ProductVariant.name` (không dấu, theo đầu từ, trong phạm vi shop của người gọi) để gõ SKU ra sản phẩm cha. Không đổi thứ tự hay kích thước trang.

### 6.2 Tạo / sửa sản phẩm và biến thể

- `POST /api/products`, `PUT /api/products/[id]`: nhận thêm `variants` tuỳ chọn: `[{ id?, name, sku?, isActive?, sortOrder?, stock?: [{ outletId, stock }] }]`. Không gửi `variants` = không đụng biến thể (app cũ sửa sản phẩm không làm mất biến thể).
- Có `variants` (client có token): server tạo / sửa / xoá mềm biến thể (hàng có `id` mà không có trong danh sách = xoá mềm, lịch sử vẫn đọc được qua snapshot), tính lại `OutletStock` và `Product.totalStock` theo 4.4. Quyền như `products.manage` (`OUTLET_INVENTORY` sửa tồn được như hôm nay).
- Sản phẩm đã có biến thể mà client **không có token** gửi `totalStock` / `outletStock[].stock` **khác** giá trị hiện tại: HTTP 400 mã mới `PRODUCT_STOCK_MANAGED_BY_VARIANTS`, kèm văn bản đọc được tiếng Việt ("Sản phẩm này có biến thể, hãy sửa tồn kho trên bản mới của ứng dụng hoặc web"). Giá trị **bằng** hiện tại: chấp nhận (app cũ luôn gửi lại cả form). Mã lỗi thêm vào `errors.json` đủ 5 ngôn ngữ (`i18n-keys`).
- Chuyển sản phẩm đã có tồn thành có biến thể: lần đầu thêm biến thể phải phân bổ tồn (tổng các biến thể mỗi chi nhánh = `OutletStock.stock` hiện tại, hoặc người dùng nhập lại; `renting` hiện có giữ ở tổng, mục 4.4). Server từ chối nếu lệch: `VARIANT_STOCK_MISMATCH`.
- Sản phẩm mà tất cả biến thể đều đã xoá / tắt: quay lại "không có biến thể"; `OutletStock` giữ số hiện tại.

### 6.3 Tạo đơn

- `POST /api/orders` (`orders/route.ts:847-966`, `orderItemSchema` ở `validation-schemas.ts:334`): thêm `variantId` tuỳ chọn trên mỗi dòng (`z.coerce.number().int().positive().nullish()`, Swift gửi `null`).
- Kiểm: biến thể thuộc đúng sản phẩm, đúng shop, đang bật. Sai: HTTP 400 mã mới `VARIANT_INVALID`.
- Sản phẩm có biến thể + client **có token** + thiếu `variantId`: HTTP 400 `VARIANT_REQUIRED`. Client **không token**: chấp nhận, dòng `variantId = null` (dòng chưa chọn biến thể).
- Snapshot: ghi `variantId`, `variantName`, `variantSku` vào `OrderItem` cùng chỗ với snapshot tên / ảnh (`orders/route.ts:962-966`). `productName` vẫn là tên sản phẩm.
- Giá, cọc, BLOCK: không đổi (mục 5).
- Chặn trùng lịch (#518): khi bật, kiểm theo `(productId, variantId)` nếu có `variantId`, **và** kiểm tổng theo `productId` (để dòng chưa chọn biến thể của app cũ vẫn được tính). Sửa `schedule-conflict-check.ts:60-140` và `schedule-conflict.ts:65-163`.
- Tồn: `updateOutletStockForOrder` nhận `orderItems[{ productId, variantId?, quantity }]`; ngoài `OutletStock` cập nhật thêm `VariantStock` khi có `variantId` (`product.ts:925-1100`). Cùng một transaction.

### 6.4 Sửa đơn, lấy hàng, trả hàng

- `PUT /api/orders/[orderId]` (`orders/[orderId]/route.ts:750-775`, `order.ts:623-645`): dòng có `variantId` thì dùng; **dòng không gửi `variantId` từ client cũ giữ `variantId`, `variantName`, `variantSku` của dòng cũ**, ghép theo `productId` và theo thứ tự xuất hiện khi một sản phẩm có nhiều dòng (cùng kiểu với `pricingOptionId` hiện có). Sản phẩm mới thêm vào đơn từ client cũ: `variantId = null`.
- `adjustOutletStockForEditedOrderItems` (`product.ts:1110-1145`) ghép theo `(productId, variantId)`.
- Đổi trạng thái (`/api/orders/[orderId]/status`, lấy hàng `RESERVED → PICKUPED`, trả `PICKUPED → RETURNED`, hủy): cùng hàm tồn ở trên; dòng `variantId = null` chỉ đổi `OutletStock`.
- Hoàn lại / khôi phục / revert (`restore`, `revert`): dùng cùng hàm kiểm chặn trùng lịch ở trên.
- Đổi chi nhánh của đơn đang ở ngoài: tồn biến thể chuyển theo chi nhánh như `adjustOutletStockForEditedOrderItems` làm cho `OutletStock`.

### 6.5 Trả dòng đơn

Mọi nơi trả dòng đơn (mục 3.3) thêm `variantId`, `variantName`, `variantSku` (null khi không có). Qua một hàm dùng chung `orderItemForClient(item, request)` đặt cạnh `productForClient`:

- Client có token: `productName` giữ tên sản phẩm; biến thể ở field riêng.
- Client không token và dòng có `variantName`: `productName = "<tên sản phẩm> (<variantName>)"`, **chỉ trong response**. Giá trị lưu không đổi; sửa đơn không gửi ngược lại chuỗi này (server dựng snapshot từ DB, `order.ts:600-620`). `productName` luôn là chuỗi không rỗng nên iOS `let productName: String` (`Order.swift:782`) vẫn giải mã được.

### 6.6 Còn trống

Xem mục 7. Mọi route nhận `variantId` tuỳ chọn; không gửi = số tổng như hôm nay.

### 6.7 Mã lỗi mới (đủ 5 ngôn ngữ trong `locales/*/errors.json`)

`VARIANT_REQUIRED`, `VARIANT_INVALID`, `VARIANT_STOCK_MISMATCH`, `PRODUCT_STOCK_MANAGED_BY_VARIANTS`, `VARIANT_SKU_EXISTS`, `VARIANT_NAME_EXISTS`. Văn bản tiếng Việt chuẩn "ngôn ngữ cửa hàng", không chữ "server", không mã trạng thái.

## 7. Còn trống theo biến thể, theo chi nhánh, theo ngày Việt Nam

Quy tắc ngày không đổi (`timezone-dates`): đầu vào là khoá ngày `YYYY-MM-DD`; đổi sang mốc UTC bằng `getUtcRangeForDateKeys`; chiếm chỗ tính bằng `occupiedDateKeysForRange` (ngày lấy và ngày trả đều chiếm, cùng ngày vẫn chiếm 1 ngày); lọc trong SQL theo mốc UTC.

Hai con số cho mỗi (sản phẩm, chi nhánh, ngày):

- `productAvailable(d) = OutletStock.stock − Σ quantity` của mọi dòng RENT `RESERVED` / `PICKUPED` chiếm ngày `d` (gồm dòng chưa chọn biến thể). Giống hôm nay.
- `variantAvailable(v, d) = VariantStock.stock(v) − Σ quantity` của dòng chiếm ngày `d` có `variantId = v`.

Còn trống hiển thị cho biến thể: `min(variantAvailable(v, d), productAvailable(d))`, tối thiểu 0.

Vì sao `min`: dòng chưa chọn biến thể (đơn từ app cũ) chỉ trừ vào tổng. Lấy `min` thì không bán quá tổng, và không bán quá riêng từng biến thể. Bù lại số có thể thấp hơn thực tế (một dòng chưa chọn làm giảm mọi biến thể khi tổng đã hết); chấp nhận ở giai đoạn 1, vì đơn giản và an toàn hơn đoán biến thể.

Thay đổi theo route:

| Route | Đổi |
|---|---|
| `GET /api/products/[id]/availability` (`route.ts:411,449`) | nhận `variantId?`; `aggregateConflictingQuantities` thêm tham số `variantId` (`availability.ts:115-141`); trả thêm `variantId` |
| `GET /api/products/[id]/availability-calendar` (`route.ts:121,156-163`) | nhận `variantId?`; lọc `orderItems.some({ productId, variantId })` cộng với tổng |
| `POST /api/products/batch-availability`, `/availability` | mỗi mục `products[]` nhận `variantId?` |
| `GET /api/public/[tenantKey]/availability` | giai đoạn 1 không nhận `variantId` (mục 12) |
| `schedule-conflict-check.ts` | mục 6.3 |

Hiệu năng: chỉ mục `[productId, variantId]` trên `OrderItem`; không có `variantId` thì truy vấn y như hôm nay.

## 8. Snapshot trong OrderItem

- `variantName`, `variantSku` lưu lúc tạo đơn; `variantId` có FK `SetNull`. Đổi tên, đổi SKU, tắt hay xoá mềm / xoá cứng biến thể: đơn cũ vẫn hiện tên cũ (đọc `variantName`, không đọc từ bảng biến thể).
- Giá và cọc đã là snapshot trong dòng (`unitPrice`, `deposit`, `pricingSnapshot`), nên thêm biến thể không đổi chúng.
- Sửa đơn: dòng giữ nguyên snapshot cũ nếu biến thể không đổi; đổi sang biến thể khác thì snapshot mới.
- Doanh thu / top sản phẩm vẫn tính theo `productId`, bỏ `CANCELLED` (`period-report.ts:282-340`): không đổi.

## 9. Khối lượng theo nền tảng

Ước lượng ngày công **thô**, chưa tính mockup.

| Nền tảng | Việc | Ước lượng |
|---|---|---|
| DB + API | migration; `ProductVariant`/`VariantStock` ở `packages/database/src/product.ts` (+ file mới `product-variant.ts`); zod ở `packages/validation` và `validation-schemas.ts`; token `variants`; `productForClient` / `orderItemForClient`; sản phẩm, đơn, tồn, còn trống, chặn trùng lịch, tìm kiếm, công khai; mã lỗi và `errors.json` | 7-8 |
| Web (`apps/client`, `packages/ui`) | form sản phẩm (mục Biến thể, `ProductForm.tsx`, `products/form/*`); chi tiết sản phẩm; chọn biến thể ở tạo đơn và giỏ nhiều tab (`orders/create/*`); chi tiết đơn, phiếu in (`ReceiptPreviewModal.tsx`); kiểm tra còn trống; trang công khai chip tên | 6 |
| iOS (chuẩn) | `Product` / `OrderItem` / `CartItem` Codable thêm field optional; form sản phẩm; chọn biến thể khi thêm giỏ; dòng giỏ; chi tiết đơn; in (`PrinterCommand.swift`, `PreviewViewController.swift`); Lịch trống; Kiểm tra còn trống; gửi header `variants`; chuỗi `en` + `vi-VN` | 6 |
| Android (theo iOS) | `Models.kt`, `ApiClient.kt`, `CartStore.kt`; `ProductFormScreen.kt`, `ProductDetailScreen.kt`; chọn biến thể; in `ThermalPrinter.kt`; `AvailabilityScreen.kt`; chuỗi `values` + `values-vi` | 6 |
| Trang công khai | chip tên biến thể trên `[tenantKey]/products` | 1 |
| Kiểm thử + e2e | mục 10 | 3-4 |
| Tổng | | khoảng 30 ngày công (thô) |

Chuỗi i18n mới đủ 5 ngôn ngữ cho web (`locales/{en,vi,ja,ko,zh}`), `en` + `vi-VN` cho iOS, `values` + `values-vi` cho Android (`i18n-keys`, `mobile-parity`). Chạy `cd tests && npx jest locales-valid-json` sau khi gộp `dev`.

## 10. Mockup cần vẽ (liệt kê, chưa vẽ)

Quy tắc của chủ shop: tất cả mockup nằm trong **một** artifact có tab (`9b56KwErJWiGpiyFEfyEY4`), không tạo trang mới; kiểm tra bằng Chrome thật trước khi đăng. Mỗi mục vẽ iOS (chuẩn), Android theo, web.

1. M1 Form sản phẩm: mục "Biến thể" (thêm dòng, tên, SKU, bật/tắt, tồn theo chi nhánh), trạng thái "sản phẩm chưa có biến thể".
2. M2 Chuyển sản phẩm đang có tồn thành có biến thể (phân bổ tồn, báo lệch).
3. M3 Chi tiết sản phẩm: danh sách biến thể với tồn từng chi nhánh.
4. M4 Chọn biến thể khi thêm vào giỏ (bottom sheet iOS / Android, hộp chọn web); biến thể hết chỗ ngày đã chọn.
5. M5 Dòng giỏ có tên biến thể, hai dòng cùng sản phẩm khác biến thể; giỏ nhiều tab.
6. M6 Chi tiết đơn + phiếu in / PDF có biến thể.
7. M7 Lịch trống (`products.detail.freeCalendar`) có chip chọn biến thể.
8. M8 Kiểm tra còn trống theo biến thể.
9. M9 Trang công khai `/{tenantKey}/products`: chip tên biến thể.
10. M10 Thông báo khi sửa tồn sản phẩm có biến thể trên app cũ (văn bản lỗi) và dòng "chưa chọn biến thể" trên web / app mới.

## 11. Kế hoạch kiểm thử

- **Golden api-compat** (`tests/api-compat`, mẫu `order-create-api-compat.test.ts`, `golden/order-create-main-real.json`): (a) payload tạo đơn app cũ cho sản phẩm không biến thể cho response y như golden; (b) sản phẩm có biến thể + không token: chấp nhận, `productName` nối tên biến thể, dòng `variantId = null`; (c) có token: thiếu `variantId` → `VARIANT_REQUIRED`; (d) list / chi tiết sản phẩm không token: JSON không đổi một key (so với golden mới sinh từ `main-real`); (e) sửa đơn từ client cũ giữ biến thể; (f) PUT sản phẩm từ client cũ: stock bằng → 200, khác → `PRODUCT_STOCK_MANAGED_BY_VARIANTS`.
- **Bất biến tồn:** test sau mỗi bước tạo / lấy / trả / hủy / sửa / đổi chi nhánh: `Σ VariantStock.stock = OutletStock.stock`, `Σ VariantStock.renting ≤ OutletStock.renting`, `available = stock − renting`.
- **Ngày:** `occupiedDateKeysForRange` với `variantId`; ca `16:59:59Z` và `17:00:00Z` (nửa đêm Việt Nam), đơn cùng ngày, đơn qua cuối tháng, đơn dài 1 năm. Chạy `TZ=UTC yarn test <file>` và `TZ=Asia/Ho_Chi_Minh yarn test <file>`, kết quả giống nhau.
- **Chặn trùng lịch (#518):** dòng chưa chọn + dòng có biến thể cùng sản phẩm.
- **Quyền:** `OUTLET_STAFF` không tạo / sửa biến thể (API từ chối, UI chỉ ẩn); `OUTLET_INVENTORY` sửa tồn; phạm vi shop / chi nhánh của biến thể trong tìm kiếm.
- **Mobile:** unit test Codable (iOS) và `org.json` (Android) với JSON có và không có field biến thể; `xcodebuild … build`, `./gradlew :app:assembleDebug` (AGENTS.md). Android theo iOS khi khác nhau.
- **E2E (hiển thị cho chủ):** `mobile-e2e-local`: bản app cũ build từ `release-2026-10-12.2` chạy với API mới + seed có sản phẩm biến thể: xem list, tạo đơn, sửa đơn, lấy hàng, trả hàng, in; Chrome có đầu, bước chậm, cho web. E2E chỉ API (`scripts/e2e/business-e2e.sh`, Jest) chạy nền, báo số.
- **Lệnh trước khi nói xong:** `yarn lint`, `yarn type-check`, `cd tests && yarn test`, `SKIP_ENV_VALIDATION=true yarn build`.

## 12. Phân giai đoạn

### Giai đoạn 1 (nhỏ nhất chạy được)

1. Migration `product_variants` + token `variants` + `productForClient` / `orderItemForClient`.
2. Tạo / sửa biến thể kèm tồn từng chi nhánh (web trước, iOS, rồi Android).
3. Chọn biến thể khi tạo / sửa đơn; snapshot; tồn và còn trống theo biến thể; chặn trùng lịch.
4. In phiếu có biến thể; tìm theo SKU / tên biến thể.
5. Trang công khai hiện chip tên.
6. Giữ app cũ chạy (mục 6.2-6.5).

### Giai đoạn 2 (làm sau, mỗi mục một issue)

- Giá riêng biến thể (nếu chủ chọn câu 1).
- Ảnh riêng cho biến thể, tìm bằng ảnh ra biến thể.
- Nhập / xuất biến thể bằng file; quét SKU ở màn tạo đơn.
- Báo cáo theo biến thể.
- Trang công khai chọn biến thể và đặt theo biến thể (`BookingRequestItem.variantId`).
- Bảng thuộc tính (Size, Màu) dùng lại giữa các sản phẩm.
- Cài đặt từng shop cho app cũ (chặn bán sản phẩm có biến thể trên app cũ), theo mẫu `loadOldAppsMode` của #1189.
- Tài sản cụ thể có QR (việc riêng, không phải biến thể).

## 13. Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| 1 | App cũ không hiện được size; nhân viên giao sai size | Cao | Nối tên biến thể vào `productName` trong response cho client không token (6.5); thông báo cho shop cập nhật app; e2e app cũ |
| 2 | App cũ tạo dòng chưa chọn biến thể → số còn trống từng biến thể thấp hơn thực tế | Trung bình | Quy tắc `min` (mục 7); hiện dòng "chưa chọn biến thể" ở web / app mới để shop gán sau |
| 3 | App cũ sửa tồn sản phẩm có biến thể bị từ chối | Trung bình | Chỉ từ chối khi giá trị đổi, văn bản đọc được (6.2); app cũ vẫn lưu được các phần khác khi stock không đổi |
| 4 | Lệch bất biến tồn (tổng ≠ Σ biến thể) do tạo / sửa đồng thời | Trung bình | Một transaction; test bất biến; lệnh đối soát chỉ đọc |
| 5 | Mất biến thể khi app cũ sửa đơn | Trung bình | Giữ `variantId` dòng cũ (6.4); golden test |
| 6 | Kích thước response danh sách tăng | Thấp | `variants[]` chỉ khi có token; chỉ tồn của chi nhánh đang lọc |
| 7 | Mix `??` với `\|\|` làm hỏng build API Next 14 | Thấp | Đóng ngoặc (AGENTS.md "Things agents get wrong") |
| 8 | Hai PR cùng thêm key `errors.json` | Thấp | Chạy `locales-valid-json` sau khi gộp `dev` |
| 9 | Mobile: iOS và Android lệch hành vi | Thấp | iOS là chuẩn; PR Android ghi rõ khác biệt |

Điểm rủi ro lớn nhất với app cũ: **mục 1**. Không thể dạy app cũ chọn size; chỉ có thể làm cho response đủ chữ và không vỡ.

## 14. API compatibility (planned, so với `release-2026-10-12.2`)

| Route / area | Change | Old iOS | Old Android | Web (tab cũ) | Risk |
|---|---|---|---|---|---|
| `GET /api/products`, `/api/products/[id]`, `/api/merchants/[id]/products` | thêm `hasVariants`, `variants[]` chỉ khi header `variants`; `totalStock`/`outletStock[]`/`available` vẫn là tổng | không gửi header: không đổi; `Product` Codable bỏ qua key lạ (`Model/Product.swift:81-`) | không đổi; đọc theo key (`data/model/Models.kt:51`) | không đổi | thấp |
| `POST /api/products`, `PUT /api/products/[id]` | thêm `variants` tuỳ chọn; client cũ sửa tồn sản phẩm có biến thể: giá trị đổi → 400 `PRODUCT_STOCK_MANAGED_BY_VARIANTS`, bằng → 200 | form cũ gửi lại cả `outletStock`: lưu được khi không đổi tồn; văn bản lỗi hiện từ `message` | như iOS (`ApiClient.kt:570,662` gửi form đầy đủ) | như app cũ | trung bình |
| `POST /api/orders` | thêm `variantId` tuỳ chọn; thiếu thì: không token → chấp nhận (dòng chưa chọn), có token → 400 `VARIANT_REQUIRED` | không gửi `variantId` (`Order.swift:782-822` không có field); đơn tạo được | như iOS (`CartStore.kt:947`) | như app cũ | trung bình: không chọn được biến thể |
| `PUT /api/orders/[orderId]` | dòng không `variantId` giữ biến thể dòng cũ (ghép theo `productId`, thứ tự) | sửa đơn giữ biến thể | giữ | giữ | thấp |
| Đổi trạng thái, `restore`, `revert` | tồn cập nhật thêm `VariantStock` khi có `variantId`; `OutletStock` đúng như cũ | không đổi | không đổi | không đổi | thấp |
| Dòng đơn trong response (`orders`, `[orderId]`, `by-number`, `calendar/orders`, `customers/[id]/orders`) | thêm `variantId`, `variantName`, `variantSku`; client không token: `productName` = `tên (biến thể)` chỉ trong response | `productName: String` vẫn chuỗi không rỗng; hiện thêm chữ biến thể | `parseOrderItem` đọc `productName` (`ApiClient.kt:1638`) | hiện thêm chữ | thấp (thay đổi chữ hiển thị) |
| availability (`/api/products/[id]/availability`, `availability-calendar`, `batch-availability`, `availability`) | thêm `variantId?` request / response | không gửi: số tổng như cũ | như cũ | như cũ | thấp |
| `GET /api/public/[tenantKey]/products` | thêm `variants: [{id, name}]` vào allowlist | n/a (không dùng) | n/a | tab cũ bỏ qua key lạ | thấp |
| `prisma/schema.prisma` | 2 bảng mới, 3 cột nullable, 1 chỉ mục | n/a | n/a | n/a | thấp (additive) |
| `X-Client-Capabilities` | thêm token `variants` | app cũ không gửi header | không gửi | không gửi | none |

Chưa xác minh (ghi rõ, không đoán): màn hình cụ thể của iOS / Android cũ có so sánh `productName` giữa hai lần tải (ví dụ hợp nhất dòng theo tên). Cần e2e với bản build từ `release-2026-10-12.2` trước khi merge.

## 15. Acceptance (khi làm code)

- [ ] Mỗi hành vi ở mục 6-8 có test hoặc lệnh trong `plan.md`
- [ ] Golden api-compat xanh; sản phẩm không biến thể không đổi một byte
- [ ] iOS và Android: build thành công, hành vi như nhau (iOS là chuẩn)
- [ ] Chuỗi mới có đủ ngôn ngữ; mã lỗi mới có trong `errors.json`
- [ ] Đơn huỷ bị loại khỏi doanh thu / top sản phẩm; ngày theo Việt Nam; giới hạn vai trò còn đúng
- [ ] Hàng `.agent/api-changes/LOG.md` được thêm khi có thay đổi API thật

## Cần chủ shop chốt

Tối đa 6 câu. Mỗi câu có đề xuất mặc định; nếu không trả lời, làm theo mặc định.

1. **Biến thể có giá riêng không?**
   Mặc định: **không**, kế thừa giá và cọc của sản phẩm (giai đoạn 2 mới thêm nếu cần).
   Lý do: giá thuê đã có FIXED / DAILY / BLOCK và cọc theo giai đoạn; giá riêng cắt ngang bảng khối ngày và là chỗ app cũ dễ tính sai. Hầu hết váy khác size cùng giá.

2. **Tồn kho theo biến thể bắt buộc hay tuỳ chọn?**
   Mặc định: **bắt buộc** khi sản phẩm có biến thể (tổng tồn sản phẩm tự là tổng các biến thể, không nhập tay).
   Lý do: tuỳ chọn thì "còn size M không" không có câu trả lời đúng, và tổng tồn có thể mâu thuẫn với từng biến thể.

3. **Một hay nhiều thuộc tính (Size, Màu tách riêng)?**
   Mặc định: **một ô tên tự do** ("M / Đỏ"), không có bảng thuộc tính.
   Lý do: đơn giản nhất chạy được; shop gõ như đang gõ hôm nay; thêm bảng thuộc tính sau không phải đổi dữ liệu đơn (đơn chỉ lưu tên snapshot).

4. **SKU có bắt buộc không?**
   Mặc định: **không bắt buộc**; nếu nhập thì không trùng trong shop.
   Lý do: nhiều tiệm chưa dùng mã; ép nhập làm chậm việc thêm biến thể. Có SKU thì gõ SKU ở ô tìm ra được sản phẩm.

5. **Tìm bằng hình ảnh trả về theo sản phẩm hay theo biến thể?**
   Mặc định: **theo sản phẩm**; biến thể dùng ảnh sản phẩm ở giai đoạn 1.
   Lý do: vector ảnh hiện theo `productId:imageIndex` (`vector-store.ts:40`); theo biến thể phải nhập ảnh từng biến thể, nhúng lại và đổi kết quả tìm ảnh mà app cũ đang dùng. Sau khi tìm ra sản phẩm, nhân viên chọn biến thể.

6. **Trang công khai `/{tenantKey}/products` hiển thị biến thể thế nào?**
   Mặc định: **một thẻ sản phẩm**, hiện các tên biến thể dạng chip để khách xem; chưa cho chọn / đặt theo biến thể (yêu cầu đặt online vẫn theo sản phẩm, shop gọi lại xác nhận size).
   Lý do: giữ trang công khai và yêu cầu đặt online (#1124) không đổi; không lộ tồn kho; chọn size trực tuyến cần còn-trống-theo-biến-thể công khai, để giai đoạn 2.
