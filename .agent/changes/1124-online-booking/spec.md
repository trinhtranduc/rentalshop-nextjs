# Spec — Đặt đơn online (#1124)

Issue: #1124 · Intent: ./intent.md · Status: draft (plan only, no code yet)

Dòng code dẫn chiếu theo `origin/dev` lúc viết (2026-10-20).

## 1. Dữ liệu (migration mới, chỉ thêm — `db-migration`)

```prisma
model BookingRequest {
  id          Int      @id @default(autoincrement())
  code        String   @unique            // 5 ký tự A–Z0–9 không nhầm (bỏ 0/O, 1/I), ví dụ A7K3Q
  merchantId  Int
  outletId    Int
  status      BookingRequestStatus @default(PENDING)
  customerName  String
  customerPhone String                    // chuẩn hoá chữ số, giữ dấu + đầu
  note        String?
  pickupPlanAt DateTime                   // đầu ngày VN của ngày lấy (giống đơn thuê)
  returnPlanAt DateTime                   // đầu ngày VN của ngày trả
  expiresAt   DateTime                    // createdAt + 24 giờ
  rejectReason String?                    // OUT_OF_STOCK | CANNOT_CONTACT | OTHER
  rejectNote  String?
  orderId     Int?     @unique            // đơn tạo ra khi xác nhận
  customerId  Int?                        // khách tìm/tạo khi xác nhận
  decidedById Int?
  decidedAt   DateTime?
  clientIp    String?                     // chỉ để chống spam, không hiện ra
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       BookingRequestItem[]
  @@index([merchantId, status, createdAt])
  @@index([outletId, status])
  @@index([customerPhone, createdAt])
}
model BookingRequestItem {
  id         Int @id @default(autoincrement())
  requestId  Int
  productId  Int
  quantity   Int
  productName String                      // tên lúc gửi (sản phẩm có thể đổi tên/xoá)
  unitPrice  Float?                       // giá hiển thị lúc gửi, chỉ để tham khảo
  @@index([requestId])
}
enum BookingRequestStatus { PENDING CONFIRMED REJECTED EXPIRED CANCELLED }
```

Cờ bật (mặc định tắt, cột có default — bảng đang có dữ liệu vẫn an toàn):
- `Merchant.onlineBookingEnabled Boolean @default(false)`
- `Outlet.acceptsOnlineBooking Boolean @default(true)` (chỉ có tác dụng khi shop bật)

Hết hạn: không cần cron. Đọc yêu cầu `PENDING` có `expiresAt < now` thì coi là `EXPIRED` (trả về như vậy và
cập nhật khi shop mở danh sách). `CANCELLED` dành cho khách huỷ từ trang theo dõi (giai đoạn sau; giữ enum).

## 2. API

Tất cả theo `api-route-standard` (zod, `ResponseBuilder`, `handleApiError`, `db`). ID ra ngoài là số.

### Công khai (dưới `/api/public/...`, đã miễn đăng nhập ở `apps/api/middleware.ts:29`; CORS như
`apps/api/app/api/public/[tenantKey]/products/route.ts:4`)

| Route | Việc |
|---|---|
| `GET /api/public/[tenantKey]/availability?productId&outletId&from&to` | Lịch còn/hết theo ngày VN cho một sản phẩm ở một chi nhánh, tối đa 62 ngày. Dùng lại `calendarDayAvailability` (`apps/api/lib/availability-calendar-days.ts:197`) và cùng truy vấn đơn RESERVED/PICKUPED như `apps/api/app/api/products/[id]/availability-calendar/route.ts:144-167`. Trả `{ days: [{date, status: 'free'|'low'|'full'}] }` — không trả số lượng tồn chính xác hay tên khách. |
| `POST /api/public/[tenantKey]/booking-requests` | Body `{outletId, pickupDate:'YYYY-MM-DD', returnDate, items:[{productId, quantity}] (1–20), name, phone, note?, website: ''}`. `website` là trường ẩn (honeypot): có giá trị → trả 200 giả, không lưu. Giới hạn tần suất: 5 yêu cầu / 10 phút / IP và 3 / giờ / số điện thoại (`createRateLimiter`, `packages/middleware/src/rate-limit/rate-limit.ts:22`, cộng kiểm tra DB theo số điện thoại vì bộ đếm trong bộ nhớ không chung giữa các instance). Kiểm tra: shop bật, chi nhánh nhận, sản phẩm thuộc shop và đang bán, ngày lấy ≥ hôm nay (VN), trả ≥ lấy, còn trống mỗi ngày (cùng luật lịch ở trên; hết → 409 `BOOKING_NOT_AVAILABLE` kèm ngày). Trả `{code, status, expiresAt}`. Gửi thông báo cho chi nhánh. |
| `GET /api/public/[tenantKey]/booking-requests/[code]` | Trang theo dõi: trạng thái, ngày, chi nhánh, món, tạm tính, số đơn khi đã xác nhận, lý do khi từ chối. Không trả số điện thoại đầy đủ (che giữa). |

`GET /api/public/[tenantKey]/products` thêm `data.merchant.onlineBooking: boolean` và trong `data.outlets`
cờ `acceptsOnlineBooking` (additive) để trang shop biết có hiện nút "Đặt thuê".

### Shop (đăng nhập, phạm vi theo `userScope`; quyền mới `bookings.view` / `bookings.manage` gán như
`orders.view` / `orders.create`; `OUTLET_STAFF` chỉ thấy chi nhánh mình)

| Route | Việc |
|---|---|
| `GET /api/booking-requests?status&outletId&page` | Danh sách, mới nhất trước, kèm `counts` theo trạng thái (cho chip có số). |
| `GET /api/booking-requests/[id]` | Chi tiết + còn trống hiện tại từng món (`free|low|full` theo ngày) + khách đã có theo số điện thoại (`getCustomerByPhone`, `packages/database/src/customer.ts:97`). |
| `POST /api/booking-requests/[id]/prepare` | Dùng khi bấm **Xác nhận**: tìm hoặc tạo khách theo số điện thoại (trong merchant), trả dữ liệu điền giỏ `{customer, outletId, orderType:'RENT', pickupPlanAt, returnPlanAt, note, items:[{productId, quantity}]}`. Không tạo đơn, không đổi trạng thái. |
| `POST /api/booking-requests/[id]/reject` | `{reason, note?}` → `REJECTED`. |
| `POST /api/orders` (có sẵn, `apps/api/app/api/orders/route.ts:458`) | Thêm trường tuỳ chọn `bookingRequestId`. Có thì trong cùng giao dịch tạo đơn: yêu cầu phải còn `PENDING` (chưa hết hạn) và cùng merchant; đặt `CONFIRMED`, `orderId`, `customerId`, `decidedById`. Không có thì như hôm nay. Kiểm tra trùng lịch giữ nguyên luật của shop (`allowOverlappingOrders`, `route.ts:955-985`). |

Mã lỗi mới (có trong `locales/*/errors.json`, iOS/Android bảng lỗi): `BOOKING_DISABLED`,
`BOOKING_NOT_AVAILABLE`, `BOOKING_RATE_LIMITED`, `BOOKING_REQUEST_NOT_FOUND`, `BOOKING_REQUEST_CLOSED`.

## 3. Ngày (`timezone-dates`)
- Khách chọn ngày dạng `YYYY-MM-DD` (ngày VN). Server đổi bằng `getUtcRangeForDateKeys` (`packages/utils/src/core/date-range.ts:317`) sang đầu ngày VN cho
  `pickupPlanAt` / `returnPlanAt`, giống đơn thuê tạo từ app.
- "Hôm nay" là ngày VN, không phải ngày UTC. Lấy và trả cùng ngày vẫn chiếm ngày đó.
- Test chạy dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.

## 4. Thông báo
Khi có yêu cầu mới: lưu hộp thư + đẩy cho người dùng của chi nhánh, dùng lại `sendOrderPushToOutlet`
(`apps/api/lib/push-notifications.ts:253`) hoặc `sendPushToUsers` (`:411`) với `type: 'booking_request'` và
`bookingRequestId`; bấm thông báo mở chi tiết yêu cầu. Không nhắn khách (ngoài phạm vi).

## 5. Web công khai (trang shop có sẵn)
- `PublicProductSheet` (`apps/client/app/[tenantKey]/products/components/PublicProductSheet.tsx:18`): thêm nút
  chính **Đặt thuê** khi shop bật và sản phẩm có giá thuê; giữ Gọi / Zalo.
- Bước chọn: chi nhánh (chỉ chi nhánh nhận đặt), lịch tháng (ngày hết bị gạch, ngày ít còn màu cam), số lượng, tạm
  tính → **Thêm vào yêu cầu**. Giỏ yêu cầu lưu `localStorage` (thử/catch), một chi nhánh và một khoảng ngày cho cả
  yêu cầu.
- Gửi: tên, số điện thoại, ghi chú, trường ẩn → trang `/{tenantKey}/booking/{code}` (theo dõi): các bước Đã gửi /
  Chờ xác nhận / Đã xác nhận (số đơn) / Từ chối (lý do) / Hết hạn; nút Gọi, Zalo.
- Ngôn ngữ: theo ngôn ngữ trang shop đang dùng (`products.public`, hiện có vi/en). Khoá mới cho vi và en đợt
  đầu; 10 ngôn ngữ còn lại làm cùng đợt dịch trang shop (ghi ở plan).

## 6. Web shop (`apps/client`)
- Mục **Đặt online** trong Đơn hàng (tab/chip có số chờ), danh sách, chi tiết như mockup màn 6.
- **Xác nhận** → gọi `prepare` → mở `apps/client/app/orders/create` điền sẵn (khách, chi nhánh, ngày, món,
  ghi chú) và gửi `bookingRequestId` khi tạo. **Từ chối** → chọn lý do.
- Cài đặt shop: bật/tắt "Nhận đặt online", chọn chi nhánh nhận.

## 7. iOS và Android (`mobile-parity`, iOS là chuẩn)
- Tab Đơn hàng: chip **Đặt online** có số đỏ (cạnh các chip trạng thái, iOS
  `Viewcontrollers/Orders/OrdersViewController.swift:232-249`); danh sách và chi tiết như mockup 5–6.
- **Xác nhận** → `prepare` → tạo giỏ mới bằng luồng nhiều giỏ (iOS `CartStore.startEditCart`
  `ViewModels/CartStore.swift:61` làm mẫu; Android `CartStore.newCart` `data/CartStore.kt:499`), điền khách, ngày,
  món (tải sản phẩm theo id như khi sửa đơn: iOS `Cart.fromOrder` `Model/Cart.swift:596`, Android
  `loadFromOrderDetail` `data/CartStore.kt:589`), giỏ mang `bookingRequestId` và gửi kèm khi "Tạo đơn".
- Khoá `MOBILE_FEATURES` mới `onlineBooking` (`apps/api/lib/mobile-app-config.ts:10`); tắt thì không có chip.
- Bấm thông báo `booking_request` mở chi tiết.

## 8. Không làm
Thanh toán/cọc online, nhắn Zalo/SMS cho khách, tài khoản khách, giữ hàng tạm, đơn bán, khách tự huỷ (enum có
sẵn để làm sau), sửa yêu cầu sau khi gửi.

## 9. Kiểm thử
- Jest API: tạo yêu cầu (đúng, honeypot, quá tần suất, shop tắt, chi nhánh không nhận, ngày quá khứ, hết hàng một
  ngày, cùng ngày lấy-trả), theo dõi theo mã (che số điện thoại), hết hạn lười, phạm vi shop/chi nhánh, `prepare`
  tìm/tạo khách, `reject`, `POST /api/orders` với `bookingRequestId` (đúng, đã đóng, merchant khác, chạy hai lần).
  Hai múi giờ.
- Golden api-compat: `POST /api/orders` không có `bookingRequestId` cho kết quả như main-real
  (`tests/api-compat/order-create-*`).
- Web: render trang shop có/không nút, lịch, theo dõi; e2e trình duyệt có cửa sổ.
- iOS/Android: unit cho chip/đếm, dựng giỏ từ `prepare`; e2e simulator/emulator (`mobile-e2e-local`).
