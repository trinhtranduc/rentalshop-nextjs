# Re-audit Android ↔ iOS và kế hoạch implementation

Ngày audit: 2026-07-31  
Branch: `feat/android-push-notifications`  
Android baseline: `a47ecc33` cộng với phần Availability đang chưa commit  
Nguồn đối chiếu iOS: `apps/mobile/POS ADBD`

Tài liệu này là trạng thái mới nhất và thay thế thứ tự ưu tiên cũ trong
`IOS_PARITY_GAP_PLAN.md`.

## Quy ước trạng thái

- **Đủ core**: đã có UI, logic chính và API integration; vẫn cần E2E thật.
- **Một phần**: có màn hoặc API nhưng thiếu behavior quan trọng/parity.
- **Thiếu**: chưa có outcome tương đương iOS.
- **Blocker**: có nguy cơ sai dữ liệu, sai tiền hoặc tạo đơn không hợp lệ.

## Kết luận

Android hiện chưa đủ UI, logic và API integration để gọi là parity với iOS.
Phần duy nhất đã bắt đầu đi đúng kiến trúc typed repository + ViewModel + unit
test là Product Availability. Các feature còn lại chủ yếu gọi
`ApiClient`/`ApiParity` trực tiếp từ composable, dùng `JSONObject`, và chưa có
test business logic.

Các blocker phải xử lý trước khi mở rộng UI:

1. Checkout RENT đang fail-open nếu batch availability lỗi.
2. Payment có nguy cơ ghi đè `depositAmount` bằng khoản vừa thu.
3. Nhiều mutation bỏ qua `Result` hoặc HTTP error nên UI có thể báo thành công
   dù server từ chối.
4. Product model làm mất pricing options, cost price và có thể không đọc được
   `images` array.
5. Không có xử lý 401/token hết hạn tập trung.

## Ma trận chức năng hiện tại

| Nhóm | Trạng thái | Đã có | Còn thiếu hoặc chưa đúng |
|---|---|---|---|
| Onboarding | Đủ core | Ba bước và persisted completion | Chưa test process restore, TalkBack và tablet |
| Login | Một phần | Email/password, session, FCM refresh | Direct API trong composable, raw error, chưa xử lý 401/session expiry tập trung |
| Forgot/check email | Một phần | Gửi email và resend | Message hard-code, chưa có resend cooldown và E2E deep link/reset |
| Register store | Một phần | Form đăng ký merchant | Validation/keyboard/UI state còn tối thiểu; chưa contract test |
| Push/deep link | Một phần | FCM register, channel, mở order | Chưa test permission Android 13+, token refresh/logout failure và cold/warm start matrix |
| Home/catalog | Một phần | RENT/SALE, search, pagination, long-press edit | Chưa hiển thị ảnh, category rõ ràng, availability state; long-press không có alternative accessible |
| Barcode sản phẩm | Đủ core | Thêm giỏ và chọn cho availability là hai mode riêng | Cần device test permission, malformed barcode và lifecycle camera |
| Availability checker | Đủ core | Search/scan, date, quantity, stock metrics, conflicts, related orders | Date đang nhập text; cần DatePicker và E2E cùng dữ liệu iOS |
| Add-to-cart availability sheet | Một phần | Gọi single-product availability | Logic parser cũ, vẫn cho thêm khi conflict; error/button semantics chưa rõ |
| Checkout batch availability | **Blocker** | Có gọi batch endpoint | `getOrDefault(emptyMap())` và fallback `emptyList()` biến network/API error thành “không conflict” |
| Cart | Một phần | Items, quantity, RENT/SALE, dates, discount, deposit, collateral, notes | Global singleton, không process restore; validation rời rạc; có implementation Cart cũ không dùng |
| Create order | Một phần | Tạo RENT/SALE, customer, dates, discount | Pricing bị ép DAILY; collateral gộp vào notes; chưa typed contract/idempotency; error availability fail-open |
| Product create/edit/delete | Một phần | Basic fields, category, gallery image, CRUD | Thiếu cost price/pricing options, camera/preview, barcode generation, image parser, delete confirm và round-trip guarantee |
| Products pagination | Đủ core | Nút Tải thêm | Chưa chống stale query/deduplicate và chưa test server pagination |
| Orders list | Một phần | Search, status/type, pagination, offline cache | Thiếu date range/sort/preserve filter/stale cancellation; cache có thể trộn filter |
| Find order/scan order | Đủ core | Search và camera barcode | Cần exact-match policy và E2E barcode formats |
| Order detail | Một phần | Summary, items, status, ready, call, edit dates, notes text | Logic/mutation trực tiếp trong UI; date text; error thường bị bỏ qua; thiếu attachment/permission rules |
| Order lifecycle | Một phần | Shared next-status flow | Chưa repository/ViewModel tests; status action có thể overflow; chưa disable duplicate taps |
| Payment collection | **Blocker** | Generic sheet và method chips | Chưa phân loại deposit/pickup/refund/sale; amount validation thiếu; request có nguy cơ ghi đè paid total |
| Payment QR | Thiếu | Fetch payload text | Chưa typed QR model, render QR, bank info, save/share/error state |
| Order note images | Thiếu | Notes text | Chưa camera/gallery/upload/preserve/remove/preview |
| Order delete | Một phần | Có API/button | Không confirm, không kiểm tra Result đầy đủ, permission/UI state chưa parity |
| Customers CRUD | Một phần | List/search/pagination/create/edit/delete/pick | Thiếu confirm, validation, permission, detail riêng |
| Customer history | Thiếu UI | Có helper API chưa dùng | Chưa màn lịch sử, pagination và mở order |
| Loyalty | Thiếu | Không có | Thiếu feature flag, summary, level/points/redeem behavior |
| Calendar | Một phần | Month grid, counts, by-date, status badge | `by-date` mặc định lọc `RESERVED`; cần xác nhận phải hiển thị mọi status như iOS; chưa ViewModel/test |
| Overview | Một phần | Period chips, totals, growth, top five | Thiếu charts, custom date/year, deposit metrics, permission restrictions, view-all/drill-down; vẫn dùng raw JSON |
| Users | Một phần | List/create/edit/active/password/delete | Role là free text, password edit chưa masked đúng, không confirm, không pagination UI, lỗi mutation dễ bị bỏ qua |
| Store info | Một phần | Name/address/phone | Thiếu field đầy đủ, user/email/role context, merchant/public/affiliate links |
| Export | Một phần | Authenticated download/share, ba loại, month | Thiếu period/date, analytics, permission theo từng loại; còn implementation browser không auth bị trùng/dead |
| Printer | Một phần | Network config/test/receipt | Chưa typed adapter; quyết định Bluetooth chưa chốt; error/permission/device matrix chưa đủ |
| Inbox | Một phần | Pagination, mark all read, delete read, open/delete item | Thiếu unread toggle UI, confirmation, pull refresh, badge synchronization và mutation error |
| Offline | Một phần | Cache product/order cơ bản | Cache không typed/versioned, không thể hiện stale, không queue mutation, có nguy cơ trả dữ liệu sai filter |
| Localization | Một phần | Có EN/VI resources | Nhiều hard-coded English/status/method/error |
| Dark mode | Một phần | Có light/dark schemes | Theme mặc định truyền `darkTheme = false`, chưa theo system và chưa contrast test |
| Accessibility | Thiếu audit/fix | Một số label chuẩn | Nhiều `contentDescription = null`, long-press-only, color-only state, chưa TalkBack/48dp/font-scale |
| Tablet/adaptive | Thiếu | Compose responsive cơ bản | Chưa NavigationRail/two-pane/constrained width; chưa landscape/tablet QA |

## Audit logic và API integration

### P0 — phải sửa trước feature mới

#### 1. Availability phải fail-closed

Hiện trạng:

- `checkCartAvailability()` dùng `getOrDefault(emptyMap())`.
- Batch fallback dùng per-product `getOrDefault(emptyList())`.
- Network timeout, 401, invalid JSON hoặc server error đều có thể bị hiểu thành
  “không có conflict”.

Yêu cầu:

- Repository trả typed result gồm `Available`, `Conflict`, `CheckFailed`.
- Checkout chỉ được bật khi toàn bộ sản phẩm trả `Available`.
- `CheckFailed` phải giữ giỏ, hiển thị retry và tuyệt đối không tạo đơn.
- Dùng chung repository/parser mới với màn Availability.

#### 2. Payment contract và paid totals

Hiện trạng:

- Sheet tính `remaining = total - deposit`.
- `recordPayment()` gửi `depositAmount = amount`.
- Không phân biệt khoản vừa thu, tổng đã thu, hoàn tiền và loại đơn/status.

Yêu cầu:

- Xác nhận backend contract từ route/service và iOS `OrderViewModel`.
- Tạo `PaymentIntent`: deposit, pickup balance, return refund, sale.
- Tạo typed `PaymentSnapshot`: total, paid, refundable, remaining.
- Mutation phải idempotent hoặc disable duplicate submit.
- Reload detail sau success; failure không được đóng sheet/mất input.

#### 3. HTTP/error/session

Hiện trạng:

- `execute()` không luôn throw cho non-2xx nếu JSON có trường `success`.
- Một số call không chạy `requireSuccess()`.
- `authedDelete()` không enforce success.
- Không có interceptor xử lý 401/token hết hạn.

Yêu cầu:

- Một response decoder duy nhất kiểm tra HTTP status và API envelope.
- Typed errors: unauthorized, forbidden, validation, conflict, timeout,
  unavailable, invalid response.
- 401 clear session một lần và điều hướng Login.
- Mutation UI chỉ optimistic khi có rollback; mặc định chờ server success.

### P1 — data contract

#### Product

- Parse `images` array/JSON string theo backend utility.
- Model pricing options thay vì chỉ `rentPrice`.
- Thêm cost price, fixed/daily/sale/deposit và outlet stock.
- Update một field phải preserve mọi field khác.
- Multipart create/update dùng cùng DTO mapper.

#### Orders/cart

- Không hard-code mọi RENT item thành `pricingType = DAILY`.
- Không gộp collateral vào notes nếu API có field riêng.
- Typed create/update request và validation dùng chung.
- Thêm idempotency guard cho create order.

#### Calendar/analytics/customers

- Calendar by-date không được ngầm chỉ lấy RESERVED nếu UI cần all status.
- Analytics không trả `JSONObject` lên UI.
- Customer order history phải dùng pagination thật, không fallback scan page đầu
  của toàn bộ orders.

## Audit UI/UX

### Blocker usability

- Thay date text bằng Material 3 DatePicker ở availability, cart và order edit.
- Payment/checkout/delete phải có loading, disabled và explicit error.
- Mọi delete cần confirmation; với dữ liệu quan trọng cần typed name/order number
  hoặc destructive dialog rõ ràng.
- Role user phải là dropdown theo permission, không nhập text tự do.
- Password phải dùng keyboard/password transformation.

### Accessibility

- Thêm content description cho icon back, add, inbox, cart, scanner và tab.
- Không để edit chỉ qua long-press; thêm overflow/menu hoặc edit button visible.
- Badge/status phải có text/semantics, không chỉ màu.
- Đảm bảo touch target 48dp và khoảng cách tối thiểu 8dp.
- Test font scale 200%, TalkBack focus order và modal focus.

### Adaptive/dark mode

- Theme theo system dark mode.
- Phone: bottom navigation.
- Tablet: NavigationRail và max content width; order/customer có thể two-pane.
- Test portrait, landscape, 7–8 inch và 10–12 inch.

### Cleanup

Loại bỏ hoặc hợp nhất code không dùng:

- `HomeScreens.kt`: `CartScreen`, `BarcodeScanScreen`, `ProductManageScreen`.
- `SettingsScreens.kt`: `ExportScreen`, `PrinterConfigScreen` nếu navigation tiếp
  tục dùng bản authenticated/network trong `SettingsParity.kt`.
- Route/constant/import không dùng.

Cleanup phải làm sau khi xác nhận không có preview/test hoặc deep link phụ thuộc.

## Kế hoạch implementation mới

### PR A — Transaction safety foundation

Ưu tiên: P0, làm đầu tiên.

Trạng thái 2026-07-31: đã implement, chưa commit.

- Checkout RENT đã chuyển sang batch validator fail-closed có quantity.
- Batch endpoint chỉ fallback sang single endpoint khi server không hỗ trợ route
  (`404/405`); mọi single request đều phải thành công.
- Non-2xx, `success: false`, JSON lỗi và 401 đã map sang typed `AppError`.
- 401 xóa session và phát event điều hướng về Login.
- Đã thêm test cho HTTP decoder, unauthorized, DELETE envelope, batch thiếu kết
  quả, lỗi mạng, conflict và gộp quantity.
- `testDebugUnitTest`, `lintDebug`, `assembleDebug`: pass.

Phạm vi:

- Chuẩn hóa HTTP decoder, API envelope và typed `AppError`.
- Thêm unauthorized event/session reset.
- Hoàn thiện `AvailabilityRepository` cho single và batch.
- Chuyển checkout sang fail-closed.
- Unit test mọi failure path.

Acceptance:

- Timeout/401/500/invalid JSON không bao giờ tạo đơn.
- Tất cả mutation phát hiện non-2xx.
- `testDebugUnitTest`, `lintDebug`, `assembleDebug` xanh.

### PR B — Payment lifecycle và QR

Ưu tiên: P0.

Trạng thái 2026-07-31: đã implement, chưa commit.

- Android không còn PUT số tiền mới vào `depositAmount`.
- `/api/payments/process` đã ghi payment ledger, kiểm tra tenant và hỗ trợ retry
  idempotent bằng client reference.
- Payment policy tính action theo loại/trạng thái đơn: SALE, RENT/RESERVED và
  RENT/PICKUPED; hỗ trợ collect/refund và trừ payment đã hoàn tất đúng purpose.
- ViewModel khóa single-flight để chống double submit và giữ reference khi retry.
- QR parse typed response, render VietQR, hiển thị bank info, lưu và chia sẻ ảnh.
- Backend QR trừ payment ledger đã hoàn tất để tránh hiển thị lại số tiền đã thu.
- Android `testDebugUnitTest`, `lintDebug`, `assembleDebug`: pass.
- API type-check toàn workspace vẫn đỏ bởi các lỗi baseline ngoài PR B; không có
  diagnostic nào trỏ tới hai payment/QR route vừa sửa.

Phạm vi:

- Audit backend/iOS payment contract.
- Payment repository + ViewModel + typed state.
- Deposit/pickup/refund/sale actions theo status.
- QR typed response, render, bank info, save/share.

Acceptance:

- Không ghi đè sai paid total.
- Không double submit.
- Mỗi status chỉ có action hợp lệ.
- QR missing-bank/malformed có UI state rõ ràng.

### PR C — Product contract và product UI

Ưu tiên: P0/P1.

Phạm vi:

- Typed product/pricing/image DTO.
- Cost/fixed/daily/sale/deposit/outlet stock round-trip.
- Camera/gallery/preview/compression/barcode generation.
- Catalog image + category + availability.
- Delete confirmation.

Acceptance:

- Edit name không đổi pricing/stock/image/category.
- Contract tests cho mọi combination pricing.

### PR D — Order editor và attachments

Ưu tiên: P1.

Phạm vi:

- Order repository/ViewModel.
- Material DatePicker, typed notes/collateral.
- Camera/gallery note images, preserve/remove/retry/preview.
- Mutation loading/error/confirmation.

### PR E — Orders/customer workflows

Ưu tiên: P1.

Phạm vi:

- Orders ViewModel, date range, sort, filter persistence, dedupe pagination.
- Customer detail, order history pagination, loyalty feature flag/summary.
- Permission and deletion confirmations.

### PR F — Calendar và Overview

Ưu tiên: P1.

Phạm vi:

- Calendar typed repository/ViewModel, all-status behavior và tests.
- Analytics typed models.
- Charts, custom period, deposit metrics, permission matrix, ranking drill-down.

### PR G — Users, store, export, inbox

Ưu tiên: P1/P2.

Phạm vi:

- Typed settings repositories/ViewModels.
- Role dropdown, masked password, user pagination và confirmations.
- Full store fields.
- Export period/date/permission.
- Inbox unread toggle, badge sync, refresh và mutation errors.

### PR H — UI foundation và cleanup

Ưu tiên: P2, nhưng accessibility fixes của màn được sửa phải làm ngay trong từng
PR trước đó.

Phạm vi:

- String/resources cleanup.
- System dark mode, semantics, touch target, font scaling.
- Tablet/adaptive layouts.
- Xóa duplicate/dead screens.
- Compose UI smoke tests.

### Decision gate — Printer

Trước PR H cần quyết định:

- Network-only là product decision chính thức; hoặc
- Android phải parity Bluetooth với iOS.

Nếu Bluetooth bắt buộc, tách thành PR riêng với permission, scan/pair, persistence,
test print và printer adapter.

## Thứ tự thực hiện

```text
PR A → PR B → PR C → PR D → PR E → PR F → PR G → PR H
```

PR B và PR C có thể phát triển song song sau khi HTTP/error foundation của PR A
ổn định, nhưng không merge trước PR A.

## Definition of done cho mỗi PR

- API contract đã đối chiếu route/backend và iOS behavior.
- UI có loading, empty, success, validation, offline, timeout và retry.
- Permission visibility khớp iOS và server vẫn enforce authorization.
- Destructive action có confirmation.
- Không `JSONObject` trong ViewModel/composable.
- Không gọi concrete API client trực tiếp từ composable mới/sửa.
- Unit test happy/failure/business rules.
- Repository contract test cho request/response/error.
- Manual parity cùng account/outlet/data trên iOS và Android.
- TalkBack label/touch target/font scale cho màn bị ảnh hưởng.
- `:app:testDebugUnitTest`, `:app:lintDebug`, `:app:assembleDebug` xanh.

## Ngoài scope hiện tại

- AI image search.
- Label printing.
- Bank-account management trong Settings khi menu iOS vẫn bị ẩn.
- Account deletion khi iOS vẫn chỉ hiển thị “Coming Soon”.
