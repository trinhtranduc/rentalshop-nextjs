# Spec #1684

## Quy tắc
Một đơn **thuê** mới (`POST /api/orders`, `orderType = RENT`) hợp lệ khi **ngày lấy hàng** (ngày Việt Nam của `pickupPlanAt`) **không trước hôm nay** (ngày Việt Nam). Ngày trả đã phải ≥ ngày lấy (đang kiểm tra sẵn).

## Ví dụ (hôm nay = 27/11/2026 theo giờ Việt Nam)

| Client | Ngày lấy hàng | Kết quả |
|---|---|---|
| web / app mới (có capability) | 28/11 | tạo được |
| web / app mới | 27/11, lúc 00:30 (giờ đã qua) | tạo được (hôm nay luôn hợp lệ) |
| web / app mới | 26/11 | giao diện không cho chọn; nếu vẫn gửi: `400 PICKUP_DATE_IN_PAST`, không tạo |
| web / app mới | 26/11 17:30 UTC = 27/11 00:30 VN | tạo được (tính theo ngày Việt Nam, không theo UTC) |
| app cũ (không capability) | 26/11 | tạo được như cũ |
| đơn bán (`SALE`) | không có ngày | không đổi |
| sửa đơn (`PUT /api/orders/[orderId]`, gia hạn) | bất kỳ | không đổi |

## API
- Capability mới `no-past-orders` (cùng cơ chế `X-Client-Capabilities`, `packages/utils/src/core/client-capabilities.ts`; helper `hasCapability`, `apps/api/lib/client-capabilities.ts`).
- Chỉ khi request có capability này **và** `orderType = RENT` **và** ngày lấy hàng < hôm nay (VN): `400`, `error.code = PICKUP_DATE_IN_PAST`. Không đổi field, kiểu hay mã lỗi nào khác.
- Không capability: không đổi gì.

## Web (`apps/client`, `packages/utils`)
- Gửi capability `no-past-orders` (thêm vào `CLIENT_CAPABILITIES`).
- Tạo đơn mới: ngày lấy hàng mặc định là hôm nay; hộp chọn ngày (`DaysDialog`) tắt các ngày trước hôm nay; `checkDays` báo lỗi nếu ngày lấy hàng < hôm nay. Khi sửa đơn: không đổi (đơn cũ có thể nằm ở quá khứ).
- Bắt lỗi `PICKUP_DATE_IN_PAST` hiện câu dịch.

## i18n
`locales/*/errors.json` (mọi ngôn ngữ đang có): `PICKUP_DATE_IN_PAST`; `orders.json` cho câu chọn ngày.

## Mobile (iOS chuẩn, rồi Android)
- Thêm token `no-past-orders` vào `DepositPlan.tokens` (iOS) / `DepositPlan.TOKENS` (Android).
- Lịch chọn ngày tạo đơn tắt ngày trước hôm nay (ngày VN); mặc định ngày lấy hàng là hôm nay; bắt `PICKUP_DATE_IN_PAST` hiện câu dịch. Sửa đơn không đổi.
- Tăng build theo `store-versions`.

## Không làm
Đổi `PUT` (sửa đơn), đơn bán, chặn bằng phiên bản tối thiểu của app (`IOS_MIN_VERSION`), đơn đặt online (`booking-requests`) và lịch xem tồn kho công khai.
