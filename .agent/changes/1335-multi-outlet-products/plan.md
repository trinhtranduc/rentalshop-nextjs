# Plan — Sản phẩm theo chi nhánh: ô tick "Hiện ở chi nhánh" và công cụ tồn nhiều chi nhánh

Issue: #1335 · Status: draft (không code cho tới khi chủ shop nói "chốt" mockup) · Spec: ./spec.md

Skill áp dụng: `issue-first` (xong: #1335, spec #1336), `db-migration`, `api-route-standard`, `api-compat-review` (lần 2 trong từng PR), `i18n-keys`, `mobile-parity` (iOS trước, Android theo), `timezone-dates` (chỉ phần (a)), `bug-fix-tdd` (nếu gặp lỗi thật), `verify-change`, `review-pr`, `mobile-e2e-local`.

## Thứ tự PR (nhỏ, vào `dev`, nhánh `feat/<issue>-<slug>`)

Mỗi mục có một issue con (mở khi bắt đầu), mỗi PR code: `Fixes` issue con, `Refs #1335`, bảng `## API compatibility` lần 2, đổi dòng LOG sang `dev`. Mỗi đợt API+web xong và verify trên `dev-api` rồi mới tới mobile (iOS trước, Android sau, cùng một PR nhiều commit).

| PR | Nội dung | Phụ thuộc |
|---|---|---|
| 0 | **Sửa lỗi trước hết**: route admin `PUT /api/merchants/[id]/products/[productId]` giữ `renting` + `STOCK_BELOW_RENTED` | không phụ thuộc `isListed`, đi trước mọi PR |
| 1 | Migration + ô tick (API + web) | chủ shop chốt mockup |
| 1m | Ô tick trên iOS rồi Android | PR 1 trên `dev-api` |
| 2 | (a) Gợi ý "chi nhánh khác còn N" (API + web) | PR 1 |
| 2m | (a) iOS rồi Android | PR 2 |
| 3 | (b) Nhân viên không nhận số thừa; `totalStock` đúng; `activeTotalStock` | độc lập, sau PR 1 |
| 3b | R1 · Cảnh báo mềm khi lưu tồn thấp hơn số đã đặt trước (`stockWarnings`; API + web, rồi iOS, Android) | độc lập, sau PR 3 |
| 4 | (c) Nhập Excel chọn chi nhánh + giới hạn gói (API + web) | PR 1 |

PR 1 là điều kiện cho mọi PR sau; PR 3 có thể đi sớm hơn PR 2 nếu chủ shop muốn vá rò rỉ cho nhân viên trước. Spec biến thể #1305 vào trước hay sau đều được (spec mục 8).

## PR 0 — Sửa lỗi route admin (đứng đầu, `bug-fix-tdd`)

1. Mở issue con (bug). Test đỏ trước (`tests/api/`): `PUT /api/merchants/[id]/products/[productId]` với `outletStock` khi dòng đang có `renting > 0` hiện đặt `renting: 0`, `available = stock` (`route.ts:198-225`); kỳ vọng giữ `renting`, `available = stock - renting`.
2. Sửa: dùng cùng logic upsert như `apps/api/app/api/products/[id]/route.ts:633-684` (đọc `renting` hiện có, `update`/`create` theo `productId_outletId`, không `deleteMany`) và cùng chặn 400 `STOCK_BELOW_RENTED`; chi nhánh không thuộc shop vẫn 404 như hôm nay. Không đổi hình dạng response.
3. Tương thích (skill `api-compat-review`): route chỉ web admin gọi (`packages/utils/src/api/merchants.ts:271`, `apps/admin/app/merchants/[id]/products/[productId]/page.tsx`); iOS/Android không gọi; lỗi 400 mới chỉ khi lưu tồn thấp hơn số đang thuê. Thêm dòng LOG riêng. Sau test xanh: `FIX_MODE=1` khoá sửa test (hook).

## PR 1 — Migration và ô tick

1. Mở issue con (feat). Thêm dòng `planned` trong LOG đã có sẵn từ PR spec; đổi chữ khi vào `dev`.
2. `prisma/schema.prisma`: `OutletStock.isListed Boolean @default(true)` + `@@index([outletId, isListed])`. Dùng `yarn db:migrate:dev --name outlet_stock_is_listed`, đọc SQL, thêm `UPDATE` backfill (spec mục 7), `yarn db:generate`. Dev trước; production là quyết định của người (hook chặn).
3. Test backfill trên DB e2e riêng (`helpers/subscription.js` world): dòng tồn 0 chưa có đơn → tắt; có tồn / đang thuê / từng có đơn → bật; sản phẩm không còn dòng bật → dòng id nhỏ nhất bật; sản phẩm đã xoá mềm bị bỏ qua.
4. `apps/api/lib/product-listing.ts` (hàm thuần, test riêng): `listedRowsForCreate`, `shopHasSingleActiveOutlet`, `isOldListingClient(request)` (không có token `branch-listing` trong `X-Client-Capabilities`; thêm token vào `ClientCapability` ở `apps/api/lib/client-capabilities.ts`). Không còn `canUnlist` (bỏ tick không chặn).
5. `apps/api/app/api/products/route.ts`: tham số `listed` (zod), truyền xuống `db.products.search` (`packages/database/src/product.ts:306-326`) thêm `isListed: true` vào `outletStock.some`; thêm `isListed` vào `select` (`:395-409`, `:150`); POST: `isListed` tuỳ chọn, dòng zero tắt (`:645-651`, `:704-711`).
6. `apps/api/app/api/products/listing/route.ts` (mới): `PUT`, `withManagementAuth`-hoặc-tương-đương như route sản phẩm, zod `{ outletId, productIds(1..200), isListed }`, quy tắc 10 và 12 (không điều kiện, không 409); `ResponseBuilder`, `handleApiError`; ghi lịch sử thay đổi sản phẩm (#519).
7. `apps/api/app/api/products/[id]/route.ts`: `isListed`, `openOrders` trong detail; `holdsStockAt` nới (`product-branch-rules.ts:139`); tự bật khi ghi `stock > 0` (`:644-667`); bỏ qua `isListed` trong PUT.
8. `apps/api/app/api/orders/route.ts:1281-1311`: tự tick món chưa tick ở chi nhánh của đơn CHỈ khi `isOldListingClient` (một `updateMany`, cùng lúc cập nhật tồn); app/web mới (có token) không tự tick. App/web mới gửi header `X-Client-Capabilities: branch-listing`.
9. `packages/database/src/outlet.ts:566`: dòng zero cho chi nhánh mới `isListed: false`; `apps/api/app/api/products/bulk-import/route.ts:521-526` dòng zero `isListed: false`.
10. `apps/api/lib/mobile-app-config.ts`: khoá `branchProducts`.
11. Web: `apps/client/app/products/list/` (bộ lọc chi nhánh gửi `listed=true`; nút "Hiện cả sản phẩm chi nhánh chưa có"; nhãn "Bán / Chưa bán"; chọn nhiều → "Hiện ở chi nhánh"), `form/ProductFormPage.tsx` + `form-model.ts` (ô "Hiện ở chi nhánh" theo chi nhánh; mặc định chi nhánh đang chọn), `[id]/page.tsx` (bảng chi nhánh + ô tick + dòng nhắc không chặn khi bỏ tick mà còn tồn / đang thuê), `orders/create/` (chọn sản phẩm với `listed=true`; quét mã món chưa bật). Dùng `*Api` trong `packages/utils`, không `fetch` thô. UI dùng chung ở `packages/ui`.
12. `locales/{en,vi,ja,ko,zh}`: `products.json` (chuỗi mục 6 của spec), dòng nhắc "Còn N cái ở chi nhánh này (M đang thuê)…" và câu cảnh báo R1 (không có mã lỗi mới). Sau khi merge `dev`, chạy `cd tests && npx jest locales-valid-json`.
13. Test (mục "Test" dưới).

## PR 2 — Gợi ý "chi nhánh khác còn N"

1. `apps/api/app/api/products/other-outlets-availability/route.ts`: dùng lại cách của `batch-availability/route.ts` (`resolveAvailabilityQueryWindow`, `aggregateConflictingQuantities`, lọc ngày trong SQL theo mốc UTC từ khoá ngày Việt Nam) cho từng chi nhánh khác đang bật; nhân viên 403.
2. Web: dòng giỏ `apps/client/app/orders/create/parts.tsx` (gần `LineStatus`, `:433`) gọi khi dòng "Hết hàng"/thiếu; chỉ vai trò chủ shop, quản lý, kho.
3. iOS (`CartV2ViewController.swift:690-727`, `Model/ProductsV2.swift:781-789`), rồi Android (`CartV2Screen.kt:1018-1041`, `ProductRules.kt:664`): một dòng nhỏ dưới chip. Không thêm khối tồn chi nhánh khác trên điện thoại (#830 giữ nguyên, spec Q13).
4. Test có ngày: Jest chạy `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; không dùng `toISOString().split`, `setHours(0,0,0,0)`, `getDate()`, `toLocaleDateString()`.

## PR 3 — Nhân viên không nhận số thừa, `totalStock` đúng

1. Failing test trước (`bug-fix-tdd`): nhân viên gọi list và detail → thấy `outletStock` mọi chi nhánh; kỳ vọng chỉ chi nhánh mình. Thêm test `totalStock` lệch (PUT chỉ có `totalStock`).
2. `packages/database/src/product.ts:395-409` + `[id]/route.ts:192-233` + `products/route.ts:194-197`: thu hẹp cho OUTLET_STAFF; `activeTotalStock`.
3. `product.ts:662`: bỏ ghi thẳng `totalStock` khi không có `outletStock`; `:844-850` giữ nghĩa; migration riêng sửa sản phẩm đang lệch (đếm bằng `SELECT` trước).
4. Kiểm iOS (`Product.swift:297-300`) và Android với tài khoản nhân viên đa chi nhánh trước khi gộp (ghi vào bảng tương thích lần 2).

## PR 3b — Cảnh báo mềm khi lưu tồn thấp hơn số đã đặt trước (R1)

1. `apps/api/lib/stock-warnings.ts` (hàm thuần + test): tính theo ngày bằng `calculateEffectivelyAvailable` và `aggregateConflictingQuantities` (`apps/api/lib/availability.ts:87-141`), cửa sổ ngày Việt Nam (`getUtcRangeForDateKeys`), không tính hai kiểu. Test chạy `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; ca: cùng ngày lấy/trả vẫn chiếm 1 ngày, đơn CANCELLED/đã xoá không tính, chỉ khi `stock` mới thấp hơn đang lưu.
2. `apps/api/app/api/products/[id]/route.ts` (sau khối upsert `:633-684`): thêm `data.stockWarnings` vào response (chỉ khi có), không đổi gì khác; `STOCK_BELOW_RENTED` giữ nguyên.
3. Web `apps/client/app/products/form/` hiện cảnh báo sau khi lưu; iOS `ProductFormViewController.swift` rồi Android `ProductFormV2Screen.kt`: cùng câu, nút xem lịch của món; chuỗi 5 ngôn ngữ.
4. Test tương thích: app cũ bỏ qua khoá mới (decode không đổi); `stockWarnings` vắng khi không thiếu.

## PR 4 — Nhập Excel

1. `bulk-import/route.ts`: `outletId` (zod tuỳ chọn), kiểm theo vai trò (spec 25), `checkPlanLimit` theo số món mới (`packages/utils/src/core/validation/plan-limits.ts:254-330`, thêm hàm đếm trước khi nhập); dòng vượt vào `skipped`.
2. Web `apps/client/app/products/import/` (`import-model.ts:147-158`, `page.tsx`): chọn chi nhánh khi có từ 2 chi nhánh; ẩn khi 1 chi nhánh.
3. Test: tab cũ (không `outletId`) vào đúng như hôm nay; chọn chi nhánh khác; role chi nhánh bị ép chi nhánh mình; vượt gói.

## Test (tên gợi ý)

- Jest `tests/api/`: `product-listing-rules.test.ts` (hàm thuần), `products-listed-filter.test.ts` (`listed` với từng vai trò, shop 1 chi nhánh bỏ qua), `product-listing-route.test.ts` (quyền, bỏ tick không điều kiện khi còn tồn / đang thuê / đơn mở, gửi lại giá trị hiện tại), `products-auto-list.test.ts` (đơn từ app cũ tự tick; đơn có token `branch-listing` không tự tick; giỏ nháp cũ không bật lại tick; PUT tồn > 0), `stock-warnings.test.ts` (PR 3b, TZ), `merchant-product-renting.test.ts` (PR 0), `products-staff-scope.test.ts` (PR 3), `other-outlets-availability.test.ts` (TZ), `bulk-import-outlet.test.ts`.
- **Tương thích cũ-mới** `products-listed-compat.test.ts`: payload thật của app cũ (Android một dòng `outletStock` không `isListed`; iOS `CreateProductRequest`; web cũ gửi mọi chi nhánh stock 0) cho kết quả như trước; GET không `listed` trả đủ sản phẩm; response là siêu tập của response cũ (mọi khoá cũ còn nguyên, cùng kiểu); đọc rồi lưu lại (read then save) không làm tắt món nào và không ghi trùng.
- Chạy ngày: `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` cho `other-outlets-availability`.
- Chuỗi: `locales-valid-json`; kiểm đủ 5 ngôn ngữ cho mọi khoá mới.
- **E2E theo vai trò** `tests/e2e/business/product-listing.e2e.test.js`, theo mẫu `settings-sync.e2e.test.js` (`Session.login('merchant' | 'outletAdmin' | 'staff' | 'inventory' | 'outletAdminOther' | 'staffOther')`, `must`, `uniqueName`; ghi mục BF-LIST trong `tests/e2e/TEST_CASES.md`):
  - tạo ở chi nhánh A → A thấy (`listed=true`), B không thấy; chủ shop thấy ở cả hai;
  - A hết hàng (tồn 0) vẫn thấy, B bật bằng listing → thấy;
  - bỏ tick khi đang thuê / đơn mở / còn tồn: thành công, đơn đang có vẫn xem/lấy/trả/huỷ/in được, lịch và kiểm trùng lịch không đổi, món không hiện khi tạo đơn mới;
  - nhân viên 403 khi tick/bỏ tick và khi gọi gợi ý; quản lý A không bật được chi nhánh B (403 `NO_OUTLET_ACCESS`); kho như quản lý;
  - nhân viên không thấy `outletStock` chi nhánh khác, `totalStock` của shop;
  - gợi ý chi nhánh khác: có tên với chủ shop/quản lý/kho; nhân viên 403;
  - đơn tạo từ payload kiểu app cũ cho món chưa tick → món tự tick; cùng đơn kèm `branch-listing` → không tự tick; giảm tồn dưới số đã đặt trước → `stockWarnings`; route admin giữ `renting`;
  - chạy: `scripts/e2e/business-e2e.sh --build --tz "UTC Asia/Ho_Chi_Minh" -- product-listing` trên DB riêng (API-only: chạy nền, báo số liệu).
- Web UI e2e (có giao diện): Chrome có cửa sổ, bước chậm; iOS `open -a Simulator` với thiết bị phía trước; Android AVD có cửa sổ (không `-no-window`). Dùng `mobile-e2e-local` + `scripts/mobile-e2e` với `E2E_ROOT` (Basic: tài khoản shop 1 chi nhánh thấy không có màn mới).

## Verify (mỗi PR code)

`yarn install --frozen-lockfile && yarn db:generate`; `yarn lint`; `yarn type-check`; `cd tests && yarn test <tên>`; `yarn build` (`SKIP_ENV_VALIDATION=true` nếu thiếu env); iOS `xcodebuild ... -scheme Development ... build`; Android `./gradlew :app:assembleDebug`. Cho mỗi lệnh, dán kết quả vào PR.

## Files (dự kiến)

- `prisma/schema.prisma`, `prisma/migrations/*` — cột, bảng, backfill
- `apps/api/app/api/products/{route.ts,[id]/route.ts,listing/route.ts,other-outlets-availability/route.ts,bulk-import/route.ts}`, `apps/api/app/api/orders/route.ts`
- `apps/api/lib/{product-listing.ts,product-branch-rules.ts,other-outlet-stock.ts,mobile-app-config.ts}`
- `packages/database/src/{product.ts,outlet.ts}`, `packages/utils/src/config/api.ts` (+ `*Api`), `packages/validation`, `packages/constants` (mã lỗi)
- `apps/client/app/products/**`, `apps/client/app/orders/create/**`
- `apps/mobile/**` (Product, ProductsV2, CartV2, form, chi tiết, Localizable.strings; thêm chuỗi bằng `cat >>` và kiểm `wc -l`), `apps/mobile-android/**`
- `locales/{en,vi,ja,ko,zh}/{products,errors}.json`
- `.agent/api-changes/LOG.md`, `tests/**`, `.agent/evals/cases/` nếu có lỗi thật

## Risks

- Backfill tắt nhầm dòng tồn 0 của món chủ shop mới tạo (spec mục 7, Q6): mức trung bình; có đường quay lại (bật bằng "Hiện cả…"); đếm trước trên dữ liệu thật do người chạy.
- App cũ tạo đơn/ghi tồn cho món tắt: giải bằng tự tick chỉ cho app cũ (Q5, quy tắc 13); cần test "đọc rồi lưu".
- Nhân viên đa chi nhánh thấy số nhỏ hơn sau PR 3 (riêng tư có chủ ý): kiểm iOS/Android trước, ghi vào PR.
- `UPDATE` backfill trên bảng lớn: chưa đo; chia lô nếu cần.
- Gửi trùng khi mạng chậm: nút khoá khi đang gửi; chưa có khoá chống trùng (có thể thêm nếu thấy cần).
- Cả hai app điện thoại phải đủ chuỗi lỗi mới (mã lỗi lạ hiện thông điệp API, không phải chuỗi dịch).
- Production: không chạy migration thật, không gọi `api.anyrent.shop` trong suốt đợt này.

## Rollback

Gỡ code (revert PR); giữ cột `isListed` (vô hại, mặc định bật). App cũ không đọc cột nên không đổi. Tắt các màn trên điện thoại từ xa bằng `MOBILE_FEATURES` (bỏ khoá `branchProducts`). Dữ liệu `isListed` bị backfill tắt: bật lại bằng `PUT /api/products/listing` hoặc một `UPDATE` thủ công do người chạy.


Việc sau (không thuộc đợt này): chuyển kho giữa chi nhánh bỏ khỏi đợt này (chủ shop chốt 2026-10-30), dời hàng bằng ô tick + sửa số lượng; lịch sử thay đổi tồn xem cùng hướng phiếu nhập/xuất. Sửa câu quảng cáo "Chuyển kho giữa các cửa hàng" (`cho-thue-ao-dai/page.tsx:146`, đề xuất "Quản lý tồn kho từng chi nhánh") là việc nhỏ riêng.