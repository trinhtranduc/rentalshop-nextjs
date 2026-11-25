# Spec — Giá theo khối giờ (Theo khối giờ)

Issue: #1621 · Status: in-progress (PR 1 API + web) · Intent: ./intent.md · Mockup: https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 (tab "★ Thuê theo giờ", v285, đã chốt 2026-11-18)

PR này (PR 1): **API + web**. iOS (PR 2) và Android (PR 3) làm sau theo thứ tự chủ shop chốt.

## Ví dụ tiền (chủ shop đã chốt trên mockup)

Váy cưới trắng (còn 1 bộ): Theo lần 500.000 · 2 giờ 150.000 · 4 giờ 250.000 · 8 giờ 400.000. Vest nam đen (còn 3 bộ): Theo lần 250.000 · 2 giờ 80.000 · 8 giờ 200.000.

| Ngày thuê | Món · cách tính | Tiền |
|---|---|---|
| 14/11 (1 ngày) | Váy · Khối 2 giờ | 150.000 |
| 14/11 | Váy · Khối 4 giờ | 250.000 |
| 14/11 | Vest · Khối 2 giờ, 2 bộ | 160.000 |
| 14/11 | Váy · Khối 4 giờ + Vest · Khối 2 giờ | 330.000 |
| 14/11 | Váy · Theo lần | 500.000 |
| 14/11 → 16/11 (3 ngày) | Váy · Khối 4 giờ | 250.000 (1 lần, không nhân 3 ngày) |

## Behavior

### Dữ liệu và lưu sản phẩm
1. Mỗi khối giờ là **một** dòng `ProductPricingOption`: `type = 'HOURLY'`, `unit = 'HOUR'`, `blockSize` = số giờ (số nguyên 1–24), `price` = giá cả khối (>= 0, 0đ hợp lệ như #951), `isDefault = false`. Không migration (các cột đã có).
2. Một sản phẩm có 0–10 khối giờ; số giờ không trùng nhau; lưu theo số giờ tăng dần (`sortOrder` sau các option khác).
3. Khối giờ **không bao giờ là giá mặc định**: `normalizePricingOptions` bỏ `isDefault` của dòng HOURLY và chọn mặc định trong các dòng còn lại; `Product.pricingType` và `rentPrice` không bao giờ lấy từ dòng HOURLY. Sản phẩm phải còn ít nhất một dòng FIXED hoặc DAILY khi có khối giờ (payload chỉ có HOURLY → 400 `HOUR_BLOCKS_INVALID`).
4. Payload sai từ client có capability (số giờ ngoài 1–24 hoặc không nguyên, trùng số giờ, giá âm/thiếu, > 10 khối, chỉ có HOURLY) → 400 `HOUR_BLOCKS_INVALID`.
5. **Giữ khối giờ cho client không biết (app đã cài, web tab cũ):** client không gửi capability `hour-blocks` trong `X-Client-Capabilities` mà lưu sản phẩm (POST/PUT, có hay không `pricingSchemaVersion`) thì: các dòng HOURLY đã lưu **giữ nguyên**, dòng HOURLY trong payload bị bỏ qua. (App trên main-real gửi `pricingSchemaVersion: 2` và tự dựng chỉ FIXED/DAILY/BLOCK — iOS `ProductsV2.swift:388-390`, `ProductRequest.swift:90-91`; Android `PriceForm.kt:35-36`, `ProductFormV2Screen.kt:299-304` — nên không thể dựa vào version.)
6. Client có `hour-blocks` gửi **đủ** bộ option; bộ đó thay toàn bộ (kể cả HOURLY: gửi 0 khối = tắt giá theo khối giờ).

### Sản phẩm trả về
7. Client có `hour-blocks`: nhận các dòng HOURLY như đã lưu (`type`, `price`, `unit`, `blockSize`, `id`, `isActive`, `isDefault: false`, `sortOrder`).
8. Client không có `hour-blocks`: **không** thấy dòng HOURLY ở `GET /api/products`, `GET/PUT /api/products/[id]`, `POST /api/products`, `searchByImage` (cùng chỗ `productForClient` / `pricingOptionsForClient` đã lọc BLOCK). Lý do: app cũ gộp mọi HOURLY thành một dòng "Theo giờ" giá khối đầu (iOS `ProductsV2.swift:621-631`, Android `ProductRules.kt:600-609`). Vì luôn còn FIXED/DAILY (mục 3), danh sách không rỗng.

### Giỏ và đơn
9. Dòng thuê (RENT) chọn khối giờ gửi `pricingType: 'HOURLY'`, `pricingOptionId` = id khối, `unitPrice` = giá khối (hoặc giá sửa tay "Giá cho đơn này"), `totalPrice = unitPrice × quantity`. **Không nhân số ngày** (đã đúng trong `computeOrderLineTotal`: chỉ DAILY nhân ngày).
10. Server (POST và PUT đơn, chỉ RENT) ghi `pricingSnapshot = { type: 'HOURLY', hours, price }` từ option khi `pricingOptionId` trỏ tới một dòng HOURLY đang bật của sản phẩm (`price` = giá khối lúc tạo, không phải giá sửa tay). `pricingSnapshot` client gửi luôn bị bỏ.
11. Server tin `unitPrice`/`totalPrice` của dòng HOURLY như dòng FIXED (cho phép sửa tay giá cho đơn này); không lỗi lệch giá.
12. **Sửa đơn (PUT) giữ khối:** dòng gửi lên trùng sản phẩm với một dòng HOURLY đã lưu có snapshot, mà không có `pricingOptionId` (Android cũ không gửi — `ApiClient.kt:740`, `CartOrderSubmit.kt:142-147`) hoặc `pricingOptionId` trỏ tới option không còn: giữ `pricingOptionId` và `pricingSnapshot` đã lưu. Đổi sang cách tính khác (FIXED/DAILY/BLOCK) thì bỏ snapshot giờ. PUT chỉ đổi ngày không đổi dòng HOURLY.
13. Dòng HOURLY không có snapshot (đơn cũ kiểu "giá mỗi giờ" trước đây) giữ nguyên hành vi hiện tại.
14. Số ngày, `rentalDuration`, lịch, kiểm tra trùng lịch (`ORDER_SCHEDULE_CONFLICT`, "Cho tạo đơn khi trùng lịch"), doanh thu (loại CANCELLED) **không đổi**.

### Web (client)
15. Form sản phẩm: dòng "Theo khối giờ" dưới "Theo khối ngày", hiện "Chưa cài" hoặc "3 khối: 2 · 4 · 8 giờ" + "150.000 – 400.000"; bấm mở hộp "Giá theo khối giờ": danh sách số giờ + giá, ✕ xoá, "+ Thêm khối", "Lưu bảng giá", "Tắt giá theo khối giờ". Lưu: tự xếp tăng dần; chặn lưu khi trùng số giờ, số giờ ngoài 1–24, thiếu giá. Không quyền giá (`OUTLET_STAFF`) thì không thấy dòng này (như các giá khác).
16. Trang chi tiết sản phẩm web: hiện các khối "2 giờ 150.000đ · 4 giờ …" ở khối giá thuê (chỉ xem).
17. Trang tạo/sửa đơn web: chọn cách tính giá của dòng liệt kê từng khối "Khối 2 giờ · 150.000đ" (theo id option, không theo loại); chip dòng ghi "Khối 4 giờ · 250.000đ"; tổng = giá × SL.
18. Chi tiết đơn, phiếu in, ảnh chia sẻ đơn (web): dòng ghi "Khối 4 giờ" và công thức "1 × 250.000đ = 250.000đ"; không ghi "/giờ".
19. Danh sách sản phẩm web không hiện giá khối giờ thành "x/giờ" (bỏ qua dòng HOURLY có `blockSize`).
20. Trang shop công khai: không hiện khối giờ ở bản này (không đổi).
21. Web khai báo capability `hour-blocks` (`packages/utils/src/core/client-capabilities.ts`).

### Quyền
22. Sửa khối giờ cần quyền sửa giá sản phẩm như các giá khác; `OUTLET_STAFF` không sửa giá (ẩn UI, API từ chối như hiện nay). Ai tạo đơn được cũng chọn được khối.

## Out of scope
Chọn giờ lấy/trả; báo trùng theo giờ; thời gian nghỉ giữa hai lượt; cộng thêm mỗi giờ sau khối dài nhất; tính tiền trễ theo giờ; trang shop công khai; admin web; iOS và Android (PR 2, PR 3); nhập Excel.

## API and data
- Không migration. `ProductPricingOption.type = HOURLY`, `unit = HOUR`, `blockSize` (đã có, `schema.prisma`). `OrderItem.pricingSnapshot` (đã có, #1189).
- Header: thêm token `hour-blocks` vào `X-Client-Capabilities` (`apps/api/lib/client-capabilities.ts` `ClientCapability`).
- Zod (`packages/utils/src/core/validation-schemas.ts`): option `type` nhận `'HOURLY'` với `blockSize` int 1–24 và `unit` `'HOUR'`; `orderItemSchema.pricingType` đã nhận `HOURLY`.
- Mã lỗi mới `HOUR_BLOCKS_INVALID` (`errors.json` 5 locale).
- Routes đổi hành vi (không route mới): `GET/POST /api/products`, `GET/PUT /api/products/[id]`, `POST /api/products/searchByImage`, `POST /api/orders`, `PUT /api/orders/[orderId]`. Auth và scope giữ nguyên.
- ID ra ngoài vẫn là số (`id` option là số).

## i18n keys (en, vi, ja, ko, zh)
`products.json`: dòng form "Theo khối giờ", tóm tắt "{n} khối: {hours} giờ", tiêu đề hộp "Giá theo khối giờ", ghi chú, "+ Thêm khối", "giờ", "Lưu bảng giá", "Tắt giá theo khối giờ", lỗi nhập; `orders.json`: "Khối {n} giờ"; `errors.json`: `HOUR_BLOCKS_INVALID`. Sau khi gộp dev chạy `cd tests && npx jest locales-valid-json`.

## Acceptance
- [ ] Mỗi Behavior có test hoặc kiểm tra UI trong plan.md
- [ ] Bảng ví dụ tiền có test (hàm dùng chung + API)
- [ ] App cũ: lưu sản phẩm không mất khối giờ; không thấy khối giờ; sửa đơn có dòng khối giờ giữ snapshot
- [ ] Chuỗi đủ 5 locale; ngày VN, CANCELLED, quyền vẫn đúng
- [ ] Dòng LOG.md và bảng `## API compatibility` trong PR; iOS/Android ghi là PR sau
