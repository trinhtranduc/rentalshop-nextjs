# Plan — Đặt đơn online (#1124)

Issue: #1124 · Spec: ./spec.md · Nhánh code tách từ `dev`. Mỗi PR có issue con (`Refs #1124`), test trước, dòng
`.agent/api-changes/LOG.md` cho PR đụng API/DB.

## Các PR

| PR | Nội dung | Ước lượng |
|---|---|---|
| 1. DB + API | Migration (2 bảng, enum, 2 cột cờ), `packages/database` (booking-requests), route công khai (availability, tạo, theo dõi) + route shop (list/count, detail, prepare, reject), `bookingRequestId` trong `POST /api/orders`, quyền `bookings.*`, mã lỗi + `errors.json`, thông báo đẩy, khoá `MOBILE_FEATURES` `onlineBooking`. Jest + golden. | lớn (~1.500 dòng kèm test) |
| 2. Web công khai | Nút Đặt thuê, chọn chi nhánh/lịch/số lượng, giỏ yêu cầu, form gửi, trang theo dõi `/{tenantKey}/booking/{code}`; vi + en. | vừa |
| 3. Web shop | Đặt online (danh sách, chi tiết, từ chối), Xác nhận mở tạo đơn điền sẵn, cài đặt bật/tắt + chi nhánh. | vừa |
| 4. iOS | Chip + danh sách + chi tiết, Xác nhận → giỏ mới điền sẵn + `bookingRequestId`, thông báo, cờ. | vừa |
| 5. Android | Theo iOS. | vừa |
| 6. (sau) Dịch | Khoá booking cho 10 ngôn ngữ còn lại cùng đợt dịch trang shop. | nhỏ |

Thứ tự: 1 → (2, 3 song song) → 4 → 5. Release lên `main-real` sau PR 3 (web dùng được trước, mobile cờ tắt),
rồi sau PR 5 với `MOBILE_FEATURES` có `onlineBooking`.

## Bước trong PR 1
1. `prisma/schema.prisma` + `yarn db:migrate:dev` → thư mục migration mới (không sửa migration cũ).
2. `packages/database/src/booking-request.ts`: create (tạo mã không trùng, thử lại khi trùng), findByCode,
   list/count theo merchant/outlet/status với hết hạn lười, prepare (tìm/tạo khách), reject, confirmInTx.
3. Route theo spec §2; luật còn trống dùng `calendarDayAvailability`; ngày bằng `getUtcRangeForDateKeys`.
4. `POST /api/orders`: `bookingRequestId` tuỳ chọn trong schema, đánh dấu yêu cầu trong cùng giao dịch tạo đơn.
5. Mã lỗi, `locales/*/errors.json` (+ `errors-mobile.json`), `ResponseBuilder` mã thành công.
6. Test (§9 spec), `api-compat` golden, LOG row.

## Rollout
- Dev: migration chạy khi deploy (`apps/api/start.sh`), kiểm log; bật `onlineBookingEnabled` cho 1 shop thử bằng
  cài đặt; thử trọn luồng web công khai → web shop → app.
- Production: migration chỉ thêm (an toàn với code cũ khi revert). `MOBILE_FEATURES` production thêm
  `onlineBooking` sau khi bản store có màn mới. Mặc định mọi shop tắt cho tới khi họ tự bật.

## Rủi ro
- Spam yêu cầu: honeypot + giới hạn IP/số điện thoại; có thể thêm Turnstile sau nếu cần.
- Bộ đếm tần suất trong bộ nhớ không chung giữa nhiều instance Railway → thêm đếm theo DB cho số điện thoại.
- Hai nhân viên cùng xác nhận một yêu cầu: kiểm tra `PENDING` trong giao dịch tạo đơn; người thứ hai nhận
  `BOOKING_REQUEST_CLOSED`.
- Giá trên yêu cầu chỉ để tham khảo; giá đơn do giỏ tính như hôm nay.
- Lịch công khai lộ mức bận: chỉ trả `free|low|full`, không trả số đơn hay khách.

## Câu hỏi mở (chủ shop)
1. Ba mặc định trong intent: đồng ý?
2. Thời hạn trả lời 24 giờ: giữ, hay cho shop chọn?
3. Ai được xác nhận: mọi người dùng chi nhánh (`OUTLET_STAFF` của chi nhánh đó) hay chỉ chủ shop / quản lý?
4. Lịch công khai có hiện "còn ít" (cam) không, hay chỉ còn / hết?
5. Một yêu cầu một khoảng ngày cho mọi món (đề xuất, đơn giản) hay mỗi món ngày riêng?
6. Ngôn ngữ trang đặt đợt đầu: vi + en được không?

## Verify
```bash
cd tests && TZ=UTC yarn test booking-request api-compat order && TZ=Asia/Ho_Chi_Minh yarn test booking-request
npx tsc --noEmit -p apps/api/tsconfig.json   # các file đã sửa
yarn lint
```
