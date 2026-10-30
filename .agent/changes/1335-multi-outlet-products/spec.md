# Spec — Sản phẩm theo chi nhánh: ô tick "Hiện ở chi nhánh" và công cụ tồn nhiều chi nhánh

Issue: #1335 · Status: draft (chờ chủ shop chốt mockup, chưa code) · Intent: ./intent.md · Plan: ./plan.md

Mockup (một artifact chung, hai tab mới "Sản phẩm theo chi nhánh" và "Chi nhánh khác còn và nhập Excel"): https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4

Ký hiệu: API = `apps/api`; Web = `apps/client` + `packages/ui`; iOS = `apps/mobile` (chuẩn); And = `apps/mobile-android` (theo sau iOS).
Vai trò (chữ trong giao diện): chủ shop = MERCHANT; quản lý = OUTLET_ADMIN; kho = OUTLET_INVENTORY; nhân viên = OUTLET_STAFF. "Role chi nhánh" = `isOutletRole`.
`file:line` đọc từ `origin/dev` b4a535744 nếu không ghi khác. "chưa xác minh" = chỉ đọc code, chưa chạy thử.

## 1. Quyết định đã chốt (chủ shop)

| # | Quyết định |
|---|---|
| D1 | Sản phẩm dùng chung cả shop (một bản ghi `Product`), mỗi chi nhánh có tồn riêng (`OutletStock`). Giá chung, KHÔNG giá riêng theo chi nhánh. Một đơn thuộc đúng một chi nhánh, KHÔNG lấy hàng từ hai chi nhánh. |
| D2 | Mỗi sản phẩm có một ô chọn **"Hiện ở chi nhánh"** trong form: danh sách các chi nhánh, mỗi chi nhánh một ô tick (web và điện thoại cùng kiểu). Tick chi nhánh nào thì sản phẩm hiện ở chi nhánh đó (danh sách, tạo đơn, tìm). Nghĩa của "tick" là `OutletStock.isListed` như đã thiết kế, không đổi: nguồn duy nhất cho câu hỏi "chi nhánh có bán món này không", không suy từ tồn. Lý do: món bán hết hoặc tồn 0 vẫn phải hiện để nhập lại hoặc sửa. Mặc định khi tạo: tick đúng chi nhánh tạo sản phẩm (kể cả quản lý/kho tạo ở chi nhánh mình), các chi nhánh khác bỏ tick. Tick / bỏ tick sau đó: CHỈ chủ shop (D10). |
| D3 | Danh sách và chọn sản phẩm khi tạo đơn của chi nhánh chỉ hiện món đã tick. Đã tick mà tồn 0 vẫn hiện, ghi "Hết hàng". KHÔNG có nút "Hiện cả sản phẩm chi nhánh chưa có" (chủ shop chốt bỏ 2026-10-30): món bỏ tick không còn hiện trong danh sách chi nhánh và chỉ chủ shop tick lại được. Chủ shop thấy mọi sản phẩm và tồn từng chi nhánh. |
| D4 | Ô tick "Hiện ở chi nhánh" KHÔNG có luật chặn: bỏ tick bất cứ lúc nào, kể cả còn tồn, đang thuê hoặc đơn mở (chủ shop đồng ý 2026-10-30 sau khi kiểm vận hành, `/Users/trinhtran/AnyRent-builds/stock-edit-vs-open-orders.md`). Ô tick CHỈ ảnh hưởng danh sách sản phẩm và chọn món khi tạo đơn MỚI; đơn đang có, lấy/trả/huỷ, in, lịch, báo cáo, kiểm trùng lịch không đổi (quy tắc 12). Khi bỏ tick mà còn tồn hoặc còn đang thuê chỉ hiện MỘT dòng nhắc, không chặn. |
| D5 | Quyền giữ quyết định 11/10 (#825): quản lý và kho tạo, sửa trường dùng chung, sửa tồn chi nhánh mình; nhân viên không tạo/sửa dùng chung. Nhân viên chỉ thấy chi nhánh mình. Xem tồn chi nhánh khác: xem D11. Tick / bỏ tick: xem D10. |
| D6 | Ba việc theo thứ tự ưu tiên, ngoài ô tick (D2): (a) gợi ý "chi nhánh khác còn N" khi hết hàng lúc tạo đơn; (b) API không gửi thừa cho nhân viên và sửa `totalStock` lệch; (c) nhập Excel chọn chi nhánh, bỏ qua món đã có, kiểm giới hạn gói. **Chuyển hàng giữa chi nhánh: bỏ khỏi đợt này** (chủ shop chốt 2026-10-30): dời hàng bằng ô tick + sửa số lượng (mục 5). |
| D7 | Gói Basic (chỉ điện thoại, 1 chi nhánh): các màn mới ẩn (mục 9). |
| D8 | Với biến thể #1305: giữ khoá `(productId, outletId)`; ô tick ở cấp sản phẩm cha, biến thể theo ô tick của cha; không giả định `totalStock` khác tổng chi nhánh theo cách mâu thuẫn #1305 mục 4.2/4.4 (mục 8). |
| D10 | Hiện tại CHỈ chủ shop (MERCHANT) tick / bỏ tick "Hiện ở chi nhánh" (mọi chi nhánh, web; điện thoại nếu có màn sửa sản phẩm cho chủ shop). Quản lý (OUTLET_ADMIN), kho (OUTLET_INVENTORY) và nhân viên (OUTLET_STAFF) thấy ô tick ở dạng CHỈ XEM (mờ, kèm chú thích "Chỉ chủ shop bật/tắt"); họ vẫn tạo sản phẩm mới ở chi nhánh mình (tự tick chi nhánh mình, đã chốt) và sửa số lượng như cũ. Kiểm quyền gom vào MỘT hàm vai trò thuần `canSetBranchListing(role)` (như `sharedFieldsLockedFor`, `apps/api/lib/product-branch-rules.ts:37-143`) để mở rộng sau; không thiết kế cấu hình quyền. Quyền cho quản lý/kho tự bật món có sẵn vào chi nhánh mình: chưa làm (chủ shop chốt 2026-10-30). |
| D11 | Chi tiết sản phẩm (web, iOS, Android) có khối chỉ đọc **"Các chi nhánh khác"** (chủ shop 2026-10-30, thay Q13): mỗi dòng một chi nhánh đang hoạt động trừ chi nhánh đang xem, gồm tên, tồn, đang thuê, và "còn trên kệ hôm nay" = `max(0, tồn − đang thuê)` (đúng nghĩa `available` của #830, chưa tính đơn đặt trước; ghi chú: "Muốn biết còn đúng ngày khách thuê, xem ở màn tạo đơn"). Ai thấy: chủ shop, quản lý (OUTLET_ADMIN), kho (OUTLET_INVENTORY). Nhân viên (OUTLET_STAFF) KHÔNG thấy, chỉ chi nhánh mình. Gói Basic (1 chi nhánh) không có khối. Danh sách sản phẩm vẫn chỉ chi nhánh mình, không số chi nhánh khác (khối này chỉ ở chi tiết). |

Chưa quyết (không sửa trong đợt này): câu quảng cáo "Chuyển kho giữa các cửa hàng" (`apps/client/app/cho-thue-ao-dai/page.tsx:146`). Chủ shop chưa chọn câu thay thế; việc nhỏ riêng, xem mục 12 và Q3.

## 2. Hiện trạng (những chỗ spec này đụng tới)

| Chủ đề | Hiện trạng | Nguồn |
|---|---|---|
| Mô hình | `Product` thuộc shop, không có `outletId`; `OutletStock` một dòng cho mỗi (sản phẩm, chi nhánh), duy nhất `(productId, outletId)`; `Product.totalStock` = tổng `stock` mọi dòng, kể cả chi nhánh đã tắt | `prisma/schema.prisma:269-303`, `:350-364`; `packages/database/src/product.ts:832-859` |
| Tạo sản phẩm | bắt buộc có `outletStock`; role chi nhánh chỉ đặt tồn chi nhánh mình; mọi chi nhánh active khác tự có dòng 0 (#825) | `apps/api/app/api/products/route.ts:608-651`, `apps/api/lib/product-branch-rules.ts:189-200` |
| Chi nhánh mới | backfill dòng 0 cho mọi sản phẩm chưa xoá (#824) | `packages/database/src/outlet.ts:554-568` |
| Danh sách | role chi nhánh lọc `outletStock.some(outletId)`; vì mọi sản phẩm có dòng 0 nên thấy hết; MERCHANT không lọc (`outletId` chỉ để xem tồn) | `apps/api/app/api/products/route.ts:108-124`; `packages/database/src/product.ts:306-326` |
| Gửi thừa cho nhân viên | list và detail trả `outletStock` mọi chi nhánh, `totalStock`, `available` cả shop; web tự lọc phía trình duyệt | `packages/database/src/product.ts:395-409`; `apps/api/app/api/products/[id]/route.ts:192-233`; web `apps/client/app/products/list/list-model.ts:226-238` |
| `totalStock` lệch | PUT gửi `totalStock` không kèm `outletStock` thì ghi thẳng; sync cộng cả chi nhánh đã tắt | `packages/database/src/product.ts:662`, `:844-850` |
| Sửa dùng chung | quản lý/kho chỉ khi chi nhánh mình có tồn > 0 hoặc đang thuê (`holdsStockAt`), nếu không 403 `PRODUCT_NOT_AVAILABLE_AT_OUTLET` | `apps/api/lib/product-branch-rules.ts:139`; `products/[id]/route.ts:380-447` |
| Xoá | quản lý/kho chỉ khi chi nhánh khác không còn giữ (tồn > 0, đang thuê, đơn mở): 409 `PRODUCT_HELD_BY_OTHER_OUTLETS` | `product-branch-rules.ts:160-186`; `products/[id]/route.ts:965-1005` |
| Chi nhánh khác | `otherOutlets` (chỉ đọc) cho quản lý/kho, chỉ web (spec này thêm khối trên điện thoại, D11); không có theo ngày | `apps/api/lib/other-outlet-stock.ts:9-13`, `:64-72` |
| Còn hàng theo ngày | tính theo (sản phẩm, chi nhánh): cộng đơn RENT RESERVED/PICKUPED cùng chi nhánh | `apps/api/lib/availability.ts:115-141`; `products/batch-availability/route.ts:126-163` |
| Chip "Hết hàng" trong giỏ | iOS `CartV2ViewController.swift:690-727`, `Model/ProductsV2.swift:781-789`; And `CartV2Screen.kt:1018-1041`, `ProductRules.kt:664`; Web `apps/client/app/orders/create/parts.tsx:433` | |
| Chuyển hàng | không có bảng, route hay chuỗi; chỉ có câu quảng cáo | `cho-thue-ao-dai/page.tsx:146`; `docs/TODO.md:319` (chưa commit, checkout của chủ) |
| Nhập Excel | JSON không có chi nhánh; role chi nhánh vào chi nhánh mình; chủ shop vào `outlets.data[0]` (suy từ `createdAt desc`, chưa xác minh); barcode có rồi thì bỏ qua; không kiểm giới hạn gói | `apps/api/app/api/products/bulk-import/route.ts:320-329`, `:341-346`, `:446-465` |
| Gói | Basic: `platform: 'mobile'`, `outlets: 1`, `products: 3000`; Professional `outlets: 1`; Enterprise `outlets: 3`; số sản phẩm tính theo shop. Giá trị gói đang chạy nằm trong DB (chưa xác minh) | `packages/constants/src/subscription.ts:226-250`, `:265`, `:300`; `packages/utils/src/core/validation/entity-counts.ts:71` |

## 3. Quy tắc mới (mỗi dòng test được)

Dữ liệu và hiển thị:

1. Mỗi dòng `OutletStock` có `isListed` (mặc định ở DB: bật). Ô tick "Hiện ở chi nhánh" trong giao diện = `isListed = true`, bỏ tick = `false`; không có trạng thái nào khác. Dòng tồn vẫn có cho mọi chi nhánh active (giữ #825); ô tick chỉ quyết định hiện hay không.
2. `GET /api/products?listed=true` chỉ trả sản phẩm có dòng `isListed = true` ở chi nhánh được xác định: role chi nhánh = chi nhánh mình; MERCHANT/ADMIN = `outletId` trong query (không có `outletId` thì bỏ qua `listed`). Không gửi `listed` thì kết quả y như hôm nay. Shop chỉ có 1 chi nhánh active: bỏ qua `listed` (tránh món "biến mất" khi chi nhánh còn lại là chi nhánh được bật ít).
3. Mọi dòng `outletStock[]` trong list và detail có thêm `isListed`. Detail của chủ shop, quản lý, kho có thêm `openOrders` (số đơn RESERVED/PICKUPED có món đó ở chi nhánh) trên từng dòng, để giao diện biết có tắt được không.
4. Món bật mà tồn 0 vẫn có trong kết quả `listed=true`. Giao diện ghi "Hết hàng" (chip đỏ có sẵn, #1064).
5. Chủ shop không dùng `listed` ở màn "Tất cả chi nhánh" (web): thấy mọi sản phẩm, mỗi chi nhánh một dòng tồn kèm nhãn "Bán" hoặc "Chưa bán". Chọn một chi nhánh thì danh sách theo quy tắc 2.
6. Không có nút "Hiện cả sản phẩm chi nhánh chưa có" và không có màn "chưa hiện ở đây". Hệ quả: món bỏ tick không còn hiện trong danh sách chi nhánh (điện thoại và web); chỉ chủ shop tick lại được (form sản phẩm, web; điện thoại nếu có màn sửa cho chủ shop). Quản lý/kho/nhân viên không tự bật món có sẵn vào chi nhánh mình.
7. Chọn sản phẩm khi tạo đơn và tìm trong chi nhánh (web, iOS, Android) gọi với `listed=true` và `outletId` của đơn. Quét mã vạch ra món chưa tick: báo "Chi nhánh này chưa hiện món này", không có nút bật.
8. Chi nhánh mới (#824): các dòng tồn 0 tự thêm đều bỏ tick. Danh sách chi nhánh mới rỗng cho tới khi chủ shop tick từng món (form sản phẩm, web); `PUT /api/products/listing` nhận danh sách sản phẩm nên tick nhiều món một lần là việc giao diện làm sau, không đổi API.

Tạo và tick chi nhánh:

9. `POST /api/products`: dòng `outletStock[]` gửi lên mà không có `isListed` thì tick; dòng server tự thêm (#825) thì bỏ tick. Role chi nhánh chỉ gửi dòng chi nhánh mình (giữ) nên tick ở đó. Form (web và điện thoại cùng kiểu) có ô "Hiện ở chi nhánh": danh sách chi nhánh, mỗi dòng một ô tick. Khi tạo, tick sẵn chi nhánh tạo (chủ shop: chi nhánh đang chọn, hoặc chi nhánh mặc định khi chọn "Tất cả"); chủ shop tick thêm chi nhánh nào cũng được; quản lý/kho/nhân viên chỉ thấy dòng chi nhánh mình ở dạng chỉ xem ("Chỉ chủ shop bật/tắt").
10. `PUT /api/products/listing` body `{ outletId, productIds: number[] (1..200), isListed }` tick hoặc bỏ tick một hoặc nhiều món ở một chi nhánh, không điều kiện (quy tắc 12). Form sửa của chủ shop dùng route này.
11. Quyền tick / bỏ tick: CHỈ MERCHANT (mọi chi nhánh active của shop; ADMIN hệ thống như mọi route quản trị). OUTLET_ADMIN, OUTLET_INVENTORY, OUTLET_STAFF: 403 `INSUFFICIENT_PERMISSIONS` khi gọi route này, kể cả chi nhánh mình. Kiểm quyền ở MỘT hàm thuần `canSetBranchListing(role)` để mở thêm vai trò sau (không cấu hình quyền). Chi nhánh không thuộc shop hoặc đã tắt: 404 `OUTLET_NOT_FOUND`. Gửi lại giá trị hiện tại không phải thay đổi (app/tab cũ gửi lại cả payload vẫn được). Tạo sản phẩm tự tick chi nhánh tạo (quy tắc 9) là TẠO, không phải tick, nên quản lý/kho vẫn làm được.
12. Bỏ tick KHÔNG có điều kiện và không có lỗi chặn (không 409, không `PRODUCT_LISTING_IN_USE`). Ô tick chỉ đổi: danh sách sản phẩm của chi nhánh (`listed=true`), và chọn món khi tạo đơn MỚI (thêm món vào đơn đang sửa cũng dùng lưới này; sửa số lượng dòng đã có thì vẫn được; quét mã món chưa tick báo "Chi nhánh này chưa hiện món này"). Không đổi: xem/in/sửa đơn đang có, lấy/trả/huỷ, lịch, báo cáo, kiểm trùng lịch và "còn hàng", vì chúng đọc dòng đơn và dòng `OutletStock` theo (sản phẩm, chi nhánh), dòng này vẫn còn khi bỏ tick (bằng chứng trong báo cáo vận hành mục 6: `order.ts:593-622`, `batch-availability/route.ts:265-279`, `product.ts:964-985`, `OrderEditor.tsx:425-435`). Dòng nhắc (không chặn, chỉ hiện khi bỏ tick mà còn tồn hoặc còn đang thuê, giao diện tự tính từ `stock`/`renting` đã có): "Còn N cái ở chi nhánh này (M đang thuê), vẫn tính vào tổng nhưng không hiện khi tạo đơn." Món vẫn hiện được ở chi tiết chi nhánh của chủ shop (web). Món còn tick mà hết hàng: vẫn hiện, ghi "Hết hàng". Không hiện dòng nhắc khi không còn gì ở chi nhánh.
13. Tự tick (để món có hàng hay đơn mới từ app cũ không bị ẩn): (i) tạo đơn có món chưa tick ở chi nhánh của đơn thì tick món đó, CHỈ cho đơn tạo từ app cũ (request không có `X-Client-Capabilities: branch-listing`, cơ chế `apps/api/lib/client-capabilities.ts` như #1200); app/web mới gửi token này và KHÔNG bị tự tick (giỏ nháp có món đã bỏ tick vẫn tạo được đơn, không bật lại tick của quản lý); (ii) `PUT /api/products/[id]` ghi `stock > 0` vào dòng chưa tick mà không gửi `isListed` thì tick (app cũ). App/tab cũ không bao giờ làm một món bỏ tick. Test: đơn từ payload app cũ tự tick; cùng đơn kèm token mới không tick; giỏ nháp cũ không bật lại tick.
14. `PUT /api/products/[id]` không nhận `isListed` (bỏ qua nếu gửi). Khi lưu form sửa, giao diện gọi thêm `PUT /api/products/listing` cho từng chi nhánh đổi ô tick; không có lỗi chặn nên không còn trạng thái khoá.

Quyền khác:

15. Sửa trường dùng chung của quản lý/kho (`holdsStockAt`): được khi chi nhánh có tồn > 0, đang thuê, HOẶC món đang bật ở chi nhánh (nới thêm; nhờ vậy món "Hết hàng" vẫn sửa được). Nhân viên: không đổi.
16. Xoá sản phẩm (#823/#825): không đổi; món đang bật mà tồn 0 ở chi nhánh khác không coi là "còn giữ" (Q8).
17. Nhân viên không nhận `otherOutlets`, không tick / bỏ tick (như quản lý/kho, quy tắc 11).

(a) Chi nhánh khác còn N:

18. `POST /api/products/other-outlets-availability` body như `batch-availability` (`outletId?`, `startDate`/`endDate`, `products: [{ productId, quantity }]`) trả cho mỗi sản phẩm danh sách `outlets: [{ outletId, outletName, available }]`: các chi nhánh khác của shop đang hoạt động, món đang bật ở đó, `available > 0` theo cùng cách tính ngày của `batch-availability` (ngày Việt Nam, cùng `aggregateConflictingQuantities`), xếp theo `available` giảm dần rồi theo id. Không có: mảng rỗng.
19. Chỉ chủ shop, ADMIN, quản lý, kho gọi được; nhân viên 403 `INSUFFICIENT_PERMISSIONS` và giao diện nhân viên không gọi (chỉ thấy "Hết hàng").
20. Giao diện (web, iOS, Android): dưới chip "Hết hàng" của dòng giỏ, một dòng "Chi nhánh khác còn: Quận 7 (3), Thủ Đức (1)". Chỉ gọi khi dòng thiếu hàng. Không có nút lấy hàng sang đơn (D1: một đơn một chi nhánh); nhân viên báo khách.
21. Khối "Các chi nhánh khác" ở chi tiết sản phẩm (D11). Danh sách sản phẩm (điện thoại và web) KHÔNG hiện số chi nhánh khác. KHÔNG thay đổi API: quản lý/kho đã nhận `otherOutlets` ở `GET /api/products/[id]` (#830, `products/[id]/route.ts:239-243`, `lib/other-outlet-stock.ts:9-13,64-72`; trên `origin/main-real` cùng dòng 239), điện thoại chỉ cần đọc thêm; chủ shop đã nhận `outletStock[]` mọi chi nhánh (kèm `stock`, `renting`, `available`, `outlet.name`, `route.ts:209-233`) nên điện thoại của chủ shop tính khối từ đó (bỏ chi nhánh đang xem và chi nhánh đã tắt, dựa danh sách chi nhánh app đã giữ, #828), không thêm `otherOutlets` cho MERCHANT: ít thay đổi nhất, không đổi hình dạng response. Web: chủ shop xem trong bảng tồn của form; quản lý/kho xem `otherOutlets` ở chi tiết như hôm nay (#830). Nhân viên không nhận `otherOutlets` (và PR 3 thu hẹp `outletStock`/`totalStock` cho nhân viên). Không có theo ngày: chỉ "còn trên kệ hôm nay"; theo ngày là gợi ý ở màn tạo đơn (quy tắc 18-20).

(b) Gửi thừa và tổng tồn:

22. Với OUTLET_STAFF, `GET /api/products` và `GET /api/products/[id]` chỉ trả `outletStock` của chi nhánh mình, và `totalStock`, `available`, `renting`, `stock` tính từ dòng đó. Quản lý, kho, chủ shop không đổi. (Sửa có chủ ý về riêng tư; app cũ của nhân viên thấy số nhỏ hơn: ghi ở mục 11.)
23. `totalStock` luôn bằng tổng `stock` mọi dòng: PUT gửi `totalStock` không kèm `outletStock` thì bỏ qua số đó và tính lại từ các dòng; bulk-import và mọi chỗ ghi tồn chạy `syncProductTotalStock`. Một lần sửa dữ liệu cho sản phẩm đang lệch. Nghĩa của `totalStock` KHÔNG đổi (kể cả chi nhánh đã tắt), để khớp #1305 mục 4.4.
24. Trường mới `activeTotalStock` = tổng `stock` của các chi nhánh đang hoạt động, trong list và detail. Giao diện mới dùng số này làm "Tổng" cho chủ shop; chi nhánh đã tắt không tính (Q11).

(c) Nhập Excel (web):

25. `POST /api/products/bulk-import` nhận `outletId` tuỳ chọn. Chủ shop chọn chi nhánh trong bước nhập (mặc định chi nhánh mặc định, thứ hai là chi nhánh đang chọn); role chi nhánh luôn chi nhánh mình (bỏ qua giá trị gửi); chủ shop gửi chi nhánh không thuộc shop: 404 `OUTLET_NOT_FOUND`. Không gửi `outletId` (tab cũ): như hôm nay.
26. Món mới nhập: tồn vào chi nhánh chọn và bật ở đó; các chi nhánh khác dòng 0 tắt. Barcode đã có: bỏ qua dòng (như hôm nay, Q7). Kiểm giới hạn gói `products`: dòng nào làm vượt giới hạn vào `skipped` với lý do `PLAN_LIMIT_EXCEEDED`, phần còn lại vẫn nhập.

(d) Dời hàng giữa chi nhánh (không có tính năng riêng):

27. Không có chức năng "chuyển kho". Dời hàng = tick "Hiện ở chi nhánh" cho chi nhánh nhận và sửa số lượng ở hai chi nhánh: web, chủ shop sửa tồn mọi chi nhánh trong một lần lưu (form đã làm được, `apps/client/app/products/form/form-model.ts:205-247`); điện thoại, sửa từng chi nhánh (chi nhánh đang chọn). Quản lý/kho chỉ sửa tồn chi nhánh mình như hôm nay (#825).

Gói:

28. Shop có đúng 1 chi nhánh active (gồm mọi shop Basic): API bỏ qua `listed`; giao diện không hiện ô "Hiện ở chi nhánh", gợi ý "chi nhánh khác còn", chọn chi nhánh khi nhập Excel. Route mới vẫn chạy nếu bị gọi (không cần chặn theo gói).

Sửa lỗi đứng trước (không phụ thuộc ô tick):

29. Route admin `PUT /api/merchants/[id]/products/[productId]` (`apps/api/app/api/merchants/[id]/products/[productId]/route.ts:198-225`) hiện `deleteMany` rồi `create` `OutletStock` với `renting: 0`, `available = stock`: bug #359 chưa vá ở route này, sau đó trả hàng làm `renting` âm (báo cáo vận hành R2). Sửa: dùng cùng logic upsert giữ `renting` và cùng chặn 400 `STOCK_BELOW_RENTED` như `/api/products/[id]` (`products/[id]/route.ts:633-684`). Đây là PR sửa lỗi (`bug-fix-tdd`: test đỏ trước), không đổi hình dạng response.

## 4. Ai làm gì (bảng vai trò, API, web, iOS, Android)

| Việc | Chủ shop | Quản lý | Kho | Nhân viên | API | Web | iOS | And |
|---|---|---|---|---|---|---|---|---|
| Xem danh sách chi nhánh mình (đã bật) | có | có | có | có | `GET /api/products?listed=true&outletId` | list + tạo đơn | list + giỏ | list + giỏ |
| Xem tồn chi nhánh khác (chi tiết sản phẩm) | có (web: bảng tồn trong form; điện thoại: khối "Các chi nhánh khác") | có (web: `otherOutlets` như #830; điện thoại: khối mới) | như quản lý | KHÔNG | `otherOutlets` (quản lý/kho, có sẵn #830), `outletStock[]` (chủ shop, có sẵn); không đổi API | có (hôm nay) | khối mới (iOS trước) | khối mới (theo iOS) |
| Tick / bỏ tick "Hiện ở chi nhánh" (không chặn; chỉ dòng nhắc khi còn tồn / đang thuê) | mọi chi nhánh | chỉ xem | chỉ xem | chỉ xem | `PUT /api/products/listing` (`canSetBranchListing`; vai trò chi nhánh 403) | form (chủ shop) | form (chủ shop, nếu có màn sửa) | như iOS |
| Tạo sản phẩm (tick chi nhánh tạo) | có (tick thêm chi nhánh khác) | có (tự tick chi nhánh mình) | có (tự tick chi nhánh mình) | không | `POST /api/products` + `isListed` | form (ô "Hiện ở chi nhánh"; quản lý/kho chỉ xem) | form (cùng ô) | form (cùng ô) |
| Sửa trường dùng chung | có | khi tồn > 0, đang thuê hoặc đang bật | như quản lý | không | `holdsStockAt` nới | form | form | form |
| Sửa tồn | mọi chi nhánh (web), chi nhánh chọn (điện thoại) | chi nhánh mình | chi nhánh mình | chi nhánh mình nếu shop cấp quyền | `PUT /api/products/[id]` | form | form | form |
| Gợi ý "chi nhánh khác còn N" | tên + số | tên + số | tên + số | chỉ "Hết hàng" | `POST /api/products/other-outlets-availability` | giỏ | giỏ | giỏ |
| Nhập Excel chọn chi nhánh | có | chi nhánh mình | chi nhánh mình | không | `bulk-import` + `outletId` | có | không có | không có |

## 5. Dời hàng giữa chi nhánh: không có chức năng riêng

Chủ shop chốt (2026-10-30): chuyển kho giữa chi nhánh (nút "Chuyển sang chi nhánh khác", lịch sử chuyển) **bỏ khỏi đợt này** để đơn giản. Cách dời hàng: tick chi nhánh nhận nếu chưa tick và sửa số lượng ở hai chi nhánh; **cộng ở chi nhánh nhận trước, trừ ở chi nhánh gửi sau** (không bao giờ thiếu tổng). Web: chủ shop sửa tồn mọi chi nhánh trong một lần lưu (một giao dịch). Điện thoại: hai lần lưu rời nhau (đổi chi nhánh đang chọn giữa hai lần); quên lần hai thì tổng thiếu, không có đối chiếu. Bỏ tick chi nhánh gửi không cần tồn về 0 (quy tắc 12). Lịch sử thay đổi tồn: xem mục 12. Quy tắc #825 "role chi nhánh chỉ ghi tồn chi nhánh mình" giữ nguyên, không có ngoại lệ.

## 6. Dữ liệu và API (chỉ thêm)

Schema:

- `OutletStock.isListed Boolean @default(true)`; chỉ mục `@@index([outletId, isListed])`. Tên theo quy ước repo (`isActive`, `isDefault`, `acceptsOnlineBooking`). Mặc định bật ở DB để mọi chỗ code cũ tạo dòng (kể cả `updateOutletStockForOrder` tạo dòng thiếu: `product.ts:976`, `:1132`, và upsert `product.ts:800`) vẫn cho kết quả như cũ; code mới ghi `false` tường minh cho các dòng server tự thêm: `products/route.ts:645-651`, `outlet.ts:566`, `bulk-import/route.ts:521-526`.
- Cờ app: thêm khoá `branchProducts` vào `MOBILE_FEATURE_KEYS` (`apps/api/lib/mobile-app-config.ts:10-21`) để tắt từ xa các màn mới trên điện thoại; không đặt biến môi trường thì bật (hành vi #456).

Route:

| Route | Thay đổi |
|---|---|
| `GET /api/products` | tham số `listed=true` (tuỳ chọn); mỗi `outletStock[]` thêm `isListed`; thêm `activeTotalStock`; nhân viên chỉ nhận dòng của mình; vẫn dùng `ResponseBuilder`/`handleApiError` |
| `GET /api/products/[id]` | `outletStock[]` thêm `isListed`, `openOrders` (chủ shop/quản lý/kho); thêm `activeTotalStock`; nhân viên chỉ nhận dòng của mình |
| `POST /api/products` | `outletStock[].isListed` tuỳ chọn (quy tắc 9) |
| `PUT /api/products/[id]` | tự bật khi ghi `stock > 0` vào dòng tắt (13 ii); `totalStock` luôn tính lại (23); `holdsStockAt` nới (15) |
| `POST /api/orders` | tự tick món chưa tick ở chi nhánh của đơn, chỉ cho app cũ (13 i), cùng chỗ cập nhật tồn `apps/api/app/api/orders/route.ts:1281-1311` |
| `PUT /api/products/listing` (mới) | tick / bỏ tick hàng loạt ở một chi nhánh, không điều kiện (quy tắc 10, 12); `with*Auth` + zod + `ResponseBuilder` |
| `PUT /api/merchants/[id]/products/[productId]` | sửa lỗi: giữ `renting`, chặn `STOCK_BELOW_RENTED` (quy tắc 29) |
| `POST /api/products/other-outlets-availability` (mới) | quy tắc 18-19 |
| `POST /api/products/bulk-import` | `outletId`, giới hạn gói (quy tắc 25-26) |
| `GET /api/mobile/app-config` | thêm khoá `branchProducts` trong `features` |

Mã lỗi mới: không có (không còn `PRODUCT_LISTING_IN_USE`). Tái dùng `NO_OUTLET_ACCESS`, `INSUFFICIENT_PERMISSIONS`, `OUTLET_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `STOCK_BELOW_RENTED` (route admin, quy tắc 29).

Chuỗi giao diện mới (liệt kê để dịch 5 ngôn ngữ, skill `i18n-keys`): "Hiện ở chi nhánh", "Chỉ chủ shop bật/tắt", "Hết hàng", "Chi nhánh này chưa hiện món này", "Chi nhánh khác còn", "Nhập vào chi nhánh", dòng nhắc không chặn ("Còn N cái ở chi nhánh này (M đang thuê), vẫn tính vào tổng nhưng không hiện khi tạo đơn").

## 7. Migration và backfill (skill `db-migration`)

Một migration mới, ví dụ `20261031090000_outlet_stock_is_listed` (sau `20261026090000_order_deposit_plan`): thêm cột `isListed BOOLEAN NOT NULL DEFAULT true`, thêm chỉ mục, rồi `UPDATE`.

Backfill: BẬT nếu `stock > 0` hoặc `renting > 0` hoặc chi nhánh từng có `OrderItem` của sản phẩm đó (qua `Order.outletId`); TẮT còn lại. Thêm một bước an toàn: sản phẩm chưa xoá mà sau bước trên không còn dòng nào bật thì bật dòng có `id` nhỏ nhất (dòng của chi nhánh tạo: khi tạo, các dòng người dùng gửi được ghi trước dòng 0 tự thêm, `products/route.ts:704-711`, chưa xác minh trên dữ liệu thật).

```sql
UPDATE "OutletStock" os SET "isListed" = false
WHERE os.stock = 0 AND os.renting = 0
  AND NOT EXISTS (SELECT 1 FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
                  WHERE oi."productId" = os."productId" AND o."outletId" = os."outletId");
-- rồi bật lại dòng id nhỏ nhất của sản phẩm chưa xoá nào không còn dòng bật
```

Nguy cơ cần chủ shop biết: một dòng tồn 0 mà chưa từng có đơn sẽ bị TẮT, kể cả khi chủ shop từng tạo món ở chi nhánh đó với tồn 0 (chưa nhập hàng). Món vẫn còn, chỉ không hiện ở chi nhánh đó cho tới khi CHỦ SHOP tick lại trong form sản phẩm (quản lý/kho không tự bật được). Với shop 1 chi nhánh: không ảnh hưởng (quy tắc 2/28).

Đã kiểm chỉ đọc trên DB cục bộ (chỉ `SELECT`, `default_transaction_read_only = on`): câu truy vấn chạy được và các cột tồn tại (`OrderItem.orderId`, `Order.outletId`). DB e2e cục bộ gần như toàn dòng có tồn (`anyrent_1174_e2e`: 123 dòng, 123 bật, 0 tắt; `anyrent_996_e2e`: 122 dòng, 121 bật, 1 tắt) nên không đại diện cho production, nơi dòng 0 do #825/#824 sinh ra nhiều. Trước khi phát hành: chủ shop hoặc người có quyền chạy cùng `SELECT` đếm (số dòng sẽ tắt, số sản phẩm cần bật dòng id nhỏ nhất, số shop có từ 2 chi nhánh) trên bản sao dữ liệu thật; agent không chạm production.

Khoá/độ lớn: `ADD COLUMN ... DEFAULT true` không viết lại bảng (Postgres 11+); `UPDATE` chạm tối đa số dòng `OutletStock` (sản phẩm × chi nhánh): chấp nhận ở quy mô hiện tại, tách thành lô nếu lớn (chưa đo). Hoàn tác: bỏ code, giữ cột và bảng (vô hại). Không `DROP`.

Sửa dữ liệu `totalStock` lệch: câu `UPDATE "Product" SET "totalStock" = (SELECT COALESCE(SUM(stock),0) FROM "OutletStock" WHERE "productId" = "Product".id)` chỉ cho các dòng đang lệch, ở PR (b) (migration riêng, đếm trước bằng `SELECT`).

## 8. Điểm tiếp giáp với biến thể (#1305, PR #1306)

- #1305 giữ `OutletStock` là tổng và thêm `VariantStock` theo (biến thể, chi nhánh); khoá `productId_outletId` được dùng khắp nơi (#1305 mục 4.2). Spec này không đổi khoá và chỉ thêm MỘT cột trên `OutletStock`: không đụng lý do của #1305.
- Ô tick ở cấp sản phẩm cha (một cột trên `OutletStock`). Biến thể không có ô tick riêng: biến thể của món tắt ở chi nhánh X không hiện ở X. Bỏ tick không đổi tồn (không cần tồn về 0); biến thể của món chưa tick không hiện ở chi nhánh đó, tồn biến thể vẫn nằm ở `VariantStock`.
- `totalStock` giữ nghĩa Σ mọi dòng `OutletStock.stock` (#1305 mục 4.4). Số "tổng đang hoạt động" là trường mới `activeTotalStock`, tính từ `OutletStock`, nên vẫn đúng khi có biến thể.
- Dòng 0 khi tạo chi nhánh mới hoặc thêm biến thể mới (#1305 chưa nhắc): chi nhánh mới sinh dòng `OutletStock` tắt (quy tắc 8); biến thể mới sinh `VariantStock` 0 theo ô tick của cha. Cần #1305 ghi điều này khi chốt.
- (a) hôm nay tính theo sản phẩm; khi #1305 vào thì thêm `variantId?` giống #1305 mục 7 (`min(variantAvailable, productAvailable)`).
- Hai spec không phụ thuộc thứ tự migration: bảng và cột khác nhau. Giá: cả hai nói "một giá" (kế thừa/giá chung).

## 9. Gói Basic (điện thoại, 1 chi nhánh)

- Basic: `platform: 'mobile'`, `outlets: 1` (`packages/constants/src/subscription.ts:226-250`). Chủ shop Basic không có web, không có chi nhánh thứ hai (add-on chi nhánh chỉ cho gói nhiều chi nhánh, #826).
- Các màn mới (ô tick, gợi ý chi nhánh khác, chọn chi nhánh khi nhập Excel) ẩn khi shop có đúng 1 chi nhánh active. Không có thiết lập nào của Basic cần chỉ có trên web.
- Điều Basic vẫn nhận (phía API, không có giao diện mới): quy tắc 22 (nhân viên chỉ thấy số chi nhánh mình, shop Basic có tối đa 2 người dùng) và 23 (`totalStock` đúng). Nhân viên của shop 1 chi nhánh: số cả shop = số chi nhánh mình nên không đổi gì nhìn thấy được.
- Món bật/tắt vẫn lưu ở DB (mặc định bật); quy tắc 2/28 bỏ qua `listed` để một shop 1 chi nhánh không mất món vì dữ liệu cũ.
- Shop hạ gói từ nhiều chi nhánh xuống 1: danh sách theo quy tắc 33 (hiện mọi món). Chưa xác minh luồng hạ gói trong code; không phụ thuộc.

## 10. Câu hỏi còn mở (mỗi câu có mặc định; không trả lời thì làm theo mặc định)

| # | Câu hỏi | Mặc định đề xuất | Lý do |
|---|---|---|---|
| Q3 | Câu quảng cáo "Chuyển kho giữa các cửa hàng" trên trang áo dài (`cho-thue-ao-dai/page.tsx:146`): đổi thành câu nào? | Chủ shop chưa chọn. Đề xuất "Quản lý tồn kho từng chi nhánh". Là việc nhỏ riêng "sửa câu quảng cáo cho đúng với app", không làm trong PR này. | Không còn chuyển kho, câu cũ không đúng với app |
| Q4 | Chi nhánh mới tạo: món bật mặc định? | Bỏ tick hết (quy tắc 8); chủ shop tick từng món. Phương án: sao chép từ chi nhánh mặc định. | Khớp D2; không đoán |
| Q5 | Đơn từ app cũ có món chưa tick: tự tick hay chặn? | Tự tick, CHỈ cho đơn từ app cũ (không có token `branch-listing`); không áp dụng cho app/web mới (quy tắc 13). | App cũ vẫn thấy mọi món và không thể sửa; không để giỏ nháp mới bật lại tick |
| Q6 | Backfill tắt dòng tồn 0 chưa từng có đơn: chủ shop chấp nhận? | Có, kèm bước "mỗi sản phẩm giữ ít nhất 1 chi nhánh bật" (mục 7), và chỉ chủ shop tick lại được món bị bỏ tick nhầm; đếm trước trên bản sao thật trước khi phát hành. | Không có cách phân biệt dòng 0 do chủ shop tạo với dòng 0 do #825 sinh ra |
| Q7 | Nhập Excel gặp món đã có (barcode): bỏ qua hay bật vào chi nhánh đã chọn? | Bỏ qua như hôm nay (D6c). Muốn bật món có sẵn: chủ shop tick trong form sản phẩm. | Đúng lời chủ shop; nhỏ nhất |
| Q8 | Xoá sản phẩm: món đang bật mà tồn 0 ở chi nhánh khác có chặn quản lý xoá không? | Không chặn (giữ #823: chỉ tồn > 0, đang thuê, đơn mở). | Không đổi 409 mà app cũ đã biết |
| Q9 | Gợi ý "chi nhánh khác còn N" tính theo ngày của đơn hay tồn trên kệ? | Theo ngày của đơn (cùng cách tính `batch-availability`). | Thuê theo ngày: tồn kệ có thể đã kín lịch |
| Q10 | Tìm bằng ảnh, trang công khai và đặt online có lọc theo ô tick? | Chưa (đợt sau). Món tắt thường tồn 0 nên không đặt được. | Tránh đổi luồng khách ngoài (#974, #1124) |
| Q11 | Đổi nghĩa `totalStock` (bỏ chi nhánh đã tắt) hay thêm trường mới? | Thêm `activeTotalStock`, giữ `totalStock`. | `AGENTS.md`: không đổi nghĩa trường app cũ đọc; khớp #1305 mục 4.4 |
| Q12 | Giữ sửa tồn trực tiếp (ô số lượng, form web) khi `docs/TODO.md:297-319` muốn tồn theo phiếu nhập/điều chỉnh? | Giữ. Dời hàng bằng ô tick + sửa số lượng; lịch sử thay đổi tồn xem cùng hướng phiếu nhập/xuất. | Không đổi cách shop đang làm |

## 11. API compatibility (installed apps) — lần 1 (spec) so với `origin/main-real` @ `ddac98cfd`

Tag mới nhất là `release-2026-10-12.2` nhưng `main-real` đã nhận bản deploy sau (merge #1228) chưa được tag; so với `origin/main-real`. Lần 2 làm trong từng PR code trên diff thật. Mọi `file:line` dưới đây đọc bằng `git show origin/main-real:<đường dẫn>`.

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| `OutletStock.isListed` + migration | cột mới mặc định bật; backfill tắt dòng tồn 0 chưa từng có đơn | không đọc cột | không đọc cột | không đọc cột | thấp: app cũ không lọc theo cột, vẫn thấy mọi món |
| `GET /api/products` | `listed` tuỳ chọn; `outletStock[].isListed`; `activeTotalStock` | list gửi `outletId` không gửi `listed` (`ProductService.swift:137`); `ProductOutletStock` toàn optional (`Product.swift:89-93`), `outletStock` giải mã bằng `try?` (`Product.swift:370`) | `ProductsV2Api.kt:34` không gửi `listed`; `ApiClient.kt:1494` đọc từng khoá | `packages/utils/src/config/api.ts:652` | không có |
| `GET /api/products`, `/[id]` cho nhân viên | chỉ dòng chi nhánh mình; `totalStock`/`available`/`renting` theo dòng đó | `totalStock` thành `quantity` (`Product.swift:297-300`): nhân viên thấy số chi nhánh mình thay vì cả shop; màn nào lệch: chưa xác minh | `ProductStock.counts` đã dùng dòng chi nhánh (`ProductRules.kt:164`) | web tự lọc | thay đổi có chủ ý (riêng tư). Ai thấy: nhân viên đa chi nhánh |
| `POST /api/products` | `outletStock[].isListed` tuỳ chọn; dòng không có = bật; dòng server thêm = tắt | tạo gửi mảng `outletStock` (`ProductRequest.swift:24`) | gửi 1 dòng (`ProductsV2Api.kt:109`) | form gửi mọi chi nhánh (`form-model.ts:218`) | thấp: món mới chỉ bật ở chi nhánh tạo; app cũ vẫn thấy mọi món |
| `PUT /api/products/[id]` | tự tick khi tồn > 0; `totalStock` tính lại; `holdsStockAt` nới | `ProductService.swift:333` gửi `totalStock` kèm `outletStock` | `ProductsV2Api.kt:109`; `ApiClient.kt:884` | form gửi cả hai (`form-model.ts:391`) | thấp: nới thêm; PUT chỉ có `totalStock` không còn ghi thẳng (không thấy app thật gửi vậy) |
| `POST /api/orders` | tự tick món chưa tick, chỉ cho app cũ (không có `X-Client-Capabilities: branch-listing`) | `OrderService.swift:450` | `ApiClient.kt:341` | web tạo đơn | thấp; Q5 |
| `PUT /api/merchants/[id]/products/[productId]` (sửa lỗi) | giữ `renting` khi lưu `outletStock`; thêm 400 `STOCK_BELOW_RENTED` khi `stock < renting`; response không đổi | không gọi | không gọi | web admin gọi qua `merchantsApi.products.update` (`packages/utils/src/api/merchants.ts:271`, `apps/admin/app/merchants/[id]/products/[productId]/page.tsx:62-69` trên main-real) | thấp: chỉ web admin hệ thống; lỗi 400 mới chỉ khi lưu tồn thấp hơn số đang thuê (tab cũ hiện thông điệp lỗi) |
| `POST /api/products/bulk-import` | `outletId` tuỳ chọn; giới hạn gói; món mới bật ở chi nhánh nhập | không gọi | không gọi | `api.ts:658`; `import-model.ts:147` không gửi `outletId` | thấp: tab cũ nhập như cũ nhưng dòng vượt gói vào `skipped` |
| Chi tiết sản phẩm trên điện thoại (khối "Các chi nhánh khác"): không đổi API | đọc `otherOutlets` (quản lý/kho, `GET /api/products/[id]`, đã có trên main-real) và `outletStock[]` (chủ shop, đã có) | `Product.swift:272` (`CodingKeys` không có `otherOutlets`, khoá lạ bị bỏ), `:370` (`outletStock` đọc bằng `try?`) | `ApiClient.kt:1494-1502` (đọc từng khoá, bỏ khoá lạ) | web `apps/client/app/products/[id]/page.tsx` đã đọc `otherOutlets` | không có: app cũ bỏ qua; app mới chỉ thêm giao diện |
| `PUT /api/products/listing`, `POST /api/products/other-outlets-availability`,  | route mới | không gọi | không gọi | không gọi | không có |
| `GET /api/mobile/app-config` | khoá `branchProducts` (Bool) trong `features` | `AppConfig.swift:61-63`: bỏ khoá lạ, chỉ `false` mới tắt | `DefaultAppConfigRepository.kt:63-67`: chỉ đọc khoá trong enum của app | n/a | không có |
| mã lỗi mới | chỉ trên route mới | n/a | n/a | n/a | không có |

Dòng dự kiến (`planned`) đã thêm vào `.agent/api-changes/LOG.md`.

## 12. Ngoài phạm vi

- Giá theo chi nhánh; một đơn lấy hàng từ hai chi nhánh; phiếu giao nhận, trạng thái "đang chuyển"; tồn theo phiếu nhập/xuất/kiểm kê (`docs/TODO.md:297-319`).
- Chuyển kho giữa chi nhánh: bỏ khỏi đợt này (chủ shop chốt 2026-10-30), dời hàng bằng ô tick + sửa số lượng; lịch sử thay đổi tồn xem cùng hướng phiếu nhập/xuất (`docs/TODO.md:297-319`). Ô tick theo biến thể cũng chưa làm.
- Lọc theo ô tick cho tìm bằng ảnh, trang công khai, đặt online (Q10); API công khai đang gửi tồn từng chi nhánh cho người lạ (`apps/api/lib/public-product.ts:75-87`) — ghi nhận, không sửa ở đây.
- Sửa câu quảng cáo "Chuyển kho giữa các cửa hàng" cho đúng với app (việc nhỏ riêng, không làm trong PR này; chủ shop chưa chọn câu, đề xuất "Quản lý tồn kho từng chi nhánh"; Q3).
- Mobile nhập Excel (chỉ web có).
- Xuất Excel: giữ như hôm nay (thêm cột "Bán ở chi nhánh" là việc nhỏ sau).
- Quyền cho quản lý/kho tự bật món có sẵn vào chi nhánh mình: chưa làm (chủ shop chốt 2026-10-30); khi làm chỉ mở rộng `canSetBranchListing(role)` và thêm lại giao diện bật món cho chi nhánh mình.
- (việc sau a) "Tạm ngừng cho thuê theo ngày" cho áo giặt/sửa/hỏng, thay cho việc giảm tồn.
- (việc sau b) Lịch sử mỗi lần sửa tồn (ai, lúc nào, từ-sang, lý do), làm chung hướng phiếu nhập/xuất ở `docs/TODO.md:297-319`.
- Cảnh báo mềm khi lưu tồn thấp hơn số đã đặt trước (R1): chưa làm, chủ shop chốt 2026-10-30; khi làm dùng `calculateEffectivelyAvailable` + `aggregateConflictingQuantities` (`availability.ts:87-141`), lưu ý hàm hiện cộng tổng đơn trùng cửa sổ chứ không lấy đỉnh theo ngày (báo cáo vận hành R1: `products/[id]/route.ts:656-662`, `product.ts:1020-1033`, `status/route.ts:154-162`).
- (việc sau c) Danh sách theo dõi từ báo cáo vận hành, đề xuất mỗi mục một issue riêng:
  - R3: `stock < renting` có thể xảy ra (đơn bán, lấy hàng, sửa #504) làm mọi lần lưu form (kể cả chỉ đổi tên) bị 400 `STOCK_BELOW_RENTED`; chỉ kiểm dòng có `stock` thay đổi (`product.ts:992-1000,1020-1033`, `form-model.ts:224-230,370-372`, `products/[id]/route.ts:657`).
  - R4: form web ghi tồn tuyệt đối của mọi chi nhánh, không khoá lạc quan: lần lưu form cũ ghi đè lần sửa khác (`form-model.ts:370-372`, `products/[id]/route.ts:663-667`).
  - R5: cập nhật tồn sau đơn nằm ngoài giao dịch đơn, lỗi chỉ ghi log (`order.ts:728-730,763-767`, `orders/route.ts:1313-1317`).
  - R7: đơn PICKUPED quá hạn không nằm trong lịch ngày hôm nay nên món vẫn hiện còn hàng; kèm nhắc đơn PICKUPED quá hạn (`batch-availability/route.ts:313-316`, `availability/route.ts:315-316`, `report-days.ts:83-90`).
  - R8: ADMIN xoá đơn PICKUPED hoặc `revert` không trả `renting` (`orders/[orderId]/route.ts:1250-1255,1294`, `orders/[orderId]/revert/route.ts:84-137`).
- Dời hàng giữa chi nhánh: cộng ở chi nhánh nhận trước, trừ ở chi nhánh gửi sau (điện thoại là hai lần lưu rời nhau, web một lần lưu).

## 13. Acceptance

- [ ] Mỗi quy tắc ở mục 3 có test hoặc kiểm giao diện nêu trong `plan.md` (Jest `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` cho (a); test tương thích cũ-mới; e2e theo vai trò).
- [ ] iOS làm trước, Android theo (mục 4), cùng chuỗi và cùng mã lỗi.
- [ ] Chuỗi mới và mã lỗi mới có đủ `locales/{en,vi,ja,ko,zh}`.
- [ ] Không có trường nào app cũ đọc bị xoá, đổi tên, đổi kiểu hay đổi nghĩa; app cũ không gửi `listed` vẫn thấy toàn bộ sản phẩm.
- [ ] Doanh thu và top sản phẩm vẫn loại đơn CANCELLED; ngày tính theo ngày Việt Nam; quyền theo vai trò thực thi ở API, giao diện chỉ ẩn nút.
- [ ] Shop 1 chi nhánh (Basic) không thấy màn mới.
