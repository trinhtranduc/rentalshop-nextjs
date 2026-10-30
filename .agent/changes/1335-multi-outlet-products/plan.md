# Plan — Sản phẩm theo chi nhánh: ô tick "Hiện ở chi nhánh" và công cụ tồn nhiều chi nhánh

Issue: #1335 · Status: draft (không code cho tới khi chủ shop nói "chốt" mockup) · Spec: ./spec.md

Skill áp dụng: `issue-first` (xong: #1335, spec #1336), `db-migration`, `api-route-standard`, `api-compat-review` (lần 2 trong từng PR), `i18n-keys`, `mobile-parity` (iOS trước, Android theo), `timezone-dates` (chỉ phần (a)), `bug-fix-tdd` (nếu gặp lỗi thật), `verify-change`, `review-pr`, `mobile-e2e-local`.

## Thứ tự PR (nhỏ, vào `dev`, nhánh `feat/<issue>-<slug>`)

Mỗi mục có một issue con (mở khi bắt đầu), mỗi PR code: `Fixes` issue con, `Refs #1335`, bảng `## API compatibility` lần 2, đổi dòng LOG sang `dev`. Mỗi đợt API+web xong và verify trên `dev-api` rồi mới tới mobile (iOS trước, Android sau, cùng một PR nhiều commit).

| PR | Nội dung | Phụ thuộc |
|---|---|---|
| 1 | Migration + ô tick (API + web) | chủ shop chốt mockup |
| 1m | Ô tick trên iOS rồi Android | PR 1 trên `dev-api` |
| 2 | (a) Gợi ý "chi nhánh khác còn N" (API + web) | PR 1 |
| 2m | (a) iOS rồi Android; khối "Tồn chi nhánh khác" trên điện thoại | PR 2 |
| 3 | (b) Nhân viên không nhận số thừa; `totalStock` đúng; `activeTotalStock` | độc lập, sau PR 1 |
| 4 | (c) Nhập Excel chọn chi nhánh + giới hạn gói (API + web) | PR 1 |
| 5 | (d) Chuyển sang chi nhánh khác + lịch sử (API + web) | PR 1 |
| 5m | (d) iOS rồi Android | PR 5 |

PR 1 là điều kiện cho mọi PR sau; PR 3 có thể đi sớm hơn PR 2 nếu chủ shop muốn vá rò rỉ cho nhân viên trước. Spec biến thể #1305 vào trước hay sau đều được (spec mục 8).

## PR 1 — Migration và ô tick

1. Mở issue con (feat). Thêm dòng `planned` trong LOG đã có sẵn từ PR spec; đổi chữ khi vào `dev`.
2. `prisma/schema.prisma`: `OutletStock.isListed Boolean @default(true)` + `@@index([outletId, isListed])`; bảng `StockTransfer` có thể để PR 5 (migration riêng, mỗi migration một việc). Dùng `yarn db:migrate:dev --name outlet_stock_is_listed`, đọc SQL, thêm `UPDATE` backfill (spec mục 7), `yarn db:generate`. Dev trước; production là quyết định của người (hook chặn).
3. Test backfill trên DB e2e riêng (`helpers/subscription.js` world): dòng tồn 0 chưa có đơn → tắt; có tồn / đang thuê / từng có đơn → bật; sản phẩm không còn dòng bật → dòng id nhỏ nhất bật; sản phẩm đã xoá mềm bị bỏ qua.
4. `apps/api/lib/product-listing.ts` (hàm thuần, test riêng): `listedRowsForCreate`, `canUnlist(row, openOrders)` → lý do, `shopHasSingleActiveOutlet`. Dùng lại `openOrdersByProductAndOutlet` (`product-branch-rules.ts`).
5. `apps/api/app/api/products/route.ts`: tham số `listed` (zod), truyền xuống `db.products.search` (`packages/database/src/product.ts:306-326`) thêm `isListed: true` vào `outletStock.some`; thêm `isListed` vào `select` (`:395-409`, `:150`); POST: `isListed` tuỳ chọn, dòng zero tắt (`:645-651`, `:704-711`).
6. `apps/api/app/api/products/listing/route.ts` (mới): `PUT`, `withManagementAuth`-hoặc-tương-đương như route sản phẩm, zod `{ outletId, productIds(1..200), isListed }`, quy tắc 10-12; all-or-nothing; `ResponseBuilder`, `handleApiError`; ghi lịch sử thay đổi sản phẩm (#519).
7. `apps/api/app/api/products/[id]/route.ts`: `isListed`, `openOrders` trong detail; `holdsStockAt` nới (`product-branch-rules.ts:139`); tự bật khi ghi `stock > 0` (`:644-667`); bỏ qua `isListed` trong PUT.
8. `apps/api/app/api/orders/route.ts:1281-1311`: tự bật món đang tắt ở chi nhánh của đơn (một `updateMany`, cùng lúc cập nhật tồn).
9. `packages/database/src/outlet.ts:566`: dòng zero cho chi nhánh mới `isListed: false`; `apps/api/app/api/products/bulk-import/route.ts:521-526` dòng zero `isListed: false`.
10. `apps/api/lib/mobile-app-config.ts`: khoá `branchProducts`.
11. Web: `apps/client/app/products/list/` (bộ lọc chi nhánh gửi `listed=true`; nút "Hiện cả sản phẩm chi nhánh chưa có"; nhãn "Bán / Chưa bán"; chọn nhiều → "Hiện ở chi nhánh"), `form/ProductFormPage.tsx` + `form-model.ts` (ô "Hiện ở chi nhánh" theo chi nhánh; mặc định chi nhánh đang chọn), `[id]/page.tsx` (bảng chi nhánh + ô tick + câu giải thích khi bị khoá), `orders/create/` (chọn sản phẩm với `listed=true`; quét mã món chưa bật). Dùng `*Api` trong `packages/utils`, không `fetch` thô. UI dùng chung ở `packages/ui`.
12. `locales/{en,vi,ja,ko,zh}`: `products.json` (chuỗi mục 6 của spec), `errors.json` (`PRODUCT_LISTING_IN_USE`). Sau khi merge `dev`, chạy `cd tests && npx jest locales-valid-json`.
13. Test (mục "Test" dưới).

## PR 2 — Gợi ý "chi nhánh khác còn N"

1. `apps/api/app/api/products/other-outlets-availability/route.ts`: dùng lại cách của `batch-availability/route.ts` (`resolveAvailabilityQueryWindow`, `aggregateConflictingQuantities`, lọc ngày trong SQL theo mốc UTC từ khoá ngày Việt Nam) cho từng chi nhánh khác đang bật; nhân viên 403.
2. Web: dòng giỏ `apps/client/app/orders/create/parts.tsx` (gần `LineStatus`, `:433`) gọi khi dòng "Hết hàng"/thiếu; chỉ vai trò chủ shop, quản lý, kho.
3. iOS (`CartV2ViewController.swift:690-727`, `Model/ProductsV2.swift:781-789`), rồi Android (`CartV2Screen.kt:1018-1041`, `ProductRules.kt:664`): một dòng nhỏ dưới chip; chi tiết sản phẩm của quản lý/kho thêm khối "Tồn chi nhánh khác" (chỉ đọc) từ `otherOutlets`; chủ shop thấy tồn từng chi nhánh.
4. Test có ngày: Jest chạy `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; không dùng `toISOString().split`, `setHours(0,0,0,0)`, `getDate()`, `toLocaleDateString()`.

## PR 3 — Nhân viên không nhận số thừa, `totalStock` đúng

1. Failing test trước (`bug-fix-tdd`): nhân viên gọi list và detail → thấy `outletStock` mọi chi nhánh; kỳ vọng chỉ chi nhánh mình. Thêm test `totalStock` lệch (PUT chỉ có `totalStock`).
2. `packages/database/src/product.ts:395-409` + `[id]/route.ts:192-233` + `products/route.ts:194-197`: thu hẹp cho OUTLET_STAFF; `activeTotalStock`.
3. `product.ts:662`: bỏ ghi thẳng `totalStock` khi không có `outletStock`; `:844-850` giữ nghĩa; migration riêng sửa sản phẩm đang lệch (đếm bằng `SELECT` trước).
4. Kiểm iOS (`Product.swift:297-300`) và Android với tài khoản nhân viên đa chi nhánh trước khi gộp (ghi vào bảng tương thích lần 2).

## PR 4 — Nhập Excel

1. `bulk-import/route.ts`: `outletId` (zod tuỳ chọn), kiểm theo vai trò (spec 25), `checkPlanLimit` theo số món mới (`packages/utils/src/core/validation/plan-limits.ts:254-330`, thêm hàm đếm trước khi nhập); dòng vượt vào `skipped`.
2. Web `apps/client/app/products/import/` (`import-model.ts:147-158`, `page.tsx`): chọn chi nhánh khi có từ 2 chi nhánh; ẩn khi 1 chi nhánh.
3. Test: tab cũ (không `outletId`) vào đúng như hôm nay; chọn chi nhánh khác; role chi nhánh bị ép chi nhánh mình; vượt gói.

## PR 5 — Chuyển sang chi nhánh khác

1. Migration `stock_transfer` (bảng `StockTransfer`, spec mục 6).
2. `apps/api/app/api/products/transfers/route.ts` (`POST`, `GET`): một `prisma.$transaction`, cập nhật có điều kiện (`updateMany ... where stock - renting >= quantity`) để hai lần gửi cùng lúc không âm tồn; `syncOutletStockAvailable`/`syncProductTotalStock`; ghi lịch sử thay đổi (#519). Kiểm quyền bằng hàm thuần `canTransferStock(role)` (chỉ MERCHANT) đặt ở `apps/api/lib/product-branch-rules.ts` (hoặc `stock-transfer.ts`); vai trò khác 403 `INSUFFICIENT_PERMISSIONS`. `unlistSender` theo spec quy tắc 28.
3. Web: chi tiết sản phẩm tại một chi nhánh: nút "Chuyển sang chi nhánh khác" (chỉ chủ shop) mở hộp thoại (chi nhánh nhận, số lượng mặc định = tồn trừ đang thuê, ghi chú), câu hỏi "Chuyển hết, bỏ sản phẩm khỏi chi nhánh này?" khi chuyển hết, và danh sách lịch sử cuối trang (không màn riêng).
4. iOS rồi Android: cùng nút, cùng sheet (5m); chỉ hiện cho chủ shop.
5. Test tương tranh (hai lần chuyển cùng lúc); không chuyển hàng đang thuê; nhận tự tick; `unlistSender` chỉ có tác dụng khi tồn 0, không đang thuê, không đơn mở; mọi vai trò khác chủ shop nhận 403 (quản lý, kho, nhân viên) ở cả POST và GET; `canTransferStock` có test thuần.

## Test (tên gợi ý)

- Jest `tests/api/`: `product-listing-rules.test.ts` (hàm thuần), `products-listed-filter.test.ts` (`listed` với từng vai trò, shop 1 chi nhánh bỏ qua), `product-listing-route.test.ts` (quyền, 409 + `data.blocked`, all-or-nothing, gửi lại giá trị hiện tại), `products-auto-list.test.ts` (đơn, PUT tồn > 0, chuyển nhanh), `products-staff-scope.test.ts` (PR 3), `other-outlets-availability.test.ts` (TZ), `bulk-import-outlet.test.ts`, `stock-transfer.test.ts`.
- **Tương thích cũ-mới** `products-listed-compat.test.ts`: payload thật của app cũ (Android một dòng `outletStock` không `isListed`; iOS `CreateProductRequest`; web cũ gửi mọi chi nhánh stock 0) cho kết quả như trước; GET không `listed` trả đủ sản phẩm; response là siêu tập của response cũ (mọi khoá cũ còn nguyên, cùng kiểu); đọc rồi lưu lại (read then save) không làm tắt món nào và không ghi trùng.
- Chạy ngày: `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` cho `other-outlets-availability`.
- Chuỗi: `locales-valid-json`; kiểm đủ 5 ngôn ngữ cho mọi khoá mới.
- **E2E theo vai trò** `tests/e2e/business/product-listing.e2e.test.js`, theo mẫu `settings-sync.e2e.test.js` (`Session.login('merchant' | 'outletAdmin' | 'staff' | 'inventory' | 'outletAdminOther' | 'staffOther')`, `must`, `uniqueName`; ghi mục BF-LIST trong `tests/e2e/TEST_CASES.md`):
  - tạo ở chi nhánh A → A thấy (`listed=true`), B không thấy; chủ shop thấy ở cả hai;
  - A hết hàng (tồn 0) vẫn thấy, B bật bằng listing → thấy;
  - tắt khi đang thuê / đơn mở / còn tồn → 409 và giá trị không đổi; sau khi trả hàng và tồn 0 → tắt được;
  - nhân viên 403 khi bật/tắt/chuyển/gợi ý; quản lý A không bật được chi nhánh B (403 `NO_OUTLET_ACCESS`); kho như quản lý;
  - nhân viên không thấy `outletStock` chi nhánh khác, `totalStock` của shop;
  - gợi ý chi nhánh khác: có tên với chủ shop/quản lý/kho; nhân viên 403;
  - chuyển sang chi nhánh khác: chủ shop chuyển được, số hai chi nhánh đúng, `totalStock` không đổi, có lịch sử, nhận tự tick, không chuyển quá số rảnh; quản lý, kho, nhân viên nhận 403;
  - đơn tạo từ payload kiểu app cũ cho món tắt → món tự bật;
  - chạy: `scripts/e2e/business-e2e.sh --build --tz "UTC Asia/Ho_Chi_Minh" -- product-listing` trên DB riêng (API-only: chạy nền, báo số liệu).
- Web UI e2e (có giao diện): Chrome có cửa sổ, bước chậm; iOS `open -a Simulator` với thiết bị phía trước; Android AVD có cửa sổ (không `-no-window`). Dùng `mobile-e2e-local` + `scripts/mobile-e2e` với `E2E_ROOT` (Basic: tài khoản shop 1 chi nhánh thấy không có màn mới).

## Verify (mỗi PR code)

`yarn install --frozen-lockfile && yarn db:generate`; `yarn lint`; `yarn type-check`; `cd tests && yarn test <tên>`; `yarn build` (`SKIP_ENV_VALIDATION=true` nếu thiếu env); iOS `xcodebuild ... -scheme Development ... build`; Android `./gradlew :app:assembleDebug`. Cho mỗi lệnh, dán kết quả vào PR.

## Files (dự kiến)

- `prisma/schema.prisma`, `prisma/migrations/*` — cột, bảng, backfill
- `apps/api/app/api/products/{route.ts,[id]/route.ts,listing/route.ts,other-outlets-availability/route.ts,transfers/route.ts,bulk-import/route.ts}`, `apps/api/app/api/orders/route.ts`
- `apps/api/lib/{product-listing.ts,product-branch-rules.ts,other-outlet-stock.ts,mobile-app-config.ts}`
- `packages/database/src/{product.ts,outlet.ts}`, `packages/utils/src/config/api.ts` (+ `*Api`), `packages/validation`, `packages/constants` (mã lỗi)
- `apps/client/app/products/**`, `apps/client/app/orders/create/**`
- `apps/mobile/**` (Product, ProductsV2, CartV2, form, chi tiết, Localizable.strings; thêm chuỗi bằng `cat >>` và kiểm `wc -l`), `apps/mobile-android/**`
- `locales/{en,vi,ja,ko,zh}/{products,errors}.json`
- `.agent/api-changes/LOG.md`, `tests/**`, `.agent/evals/cases/` nếu có lỗi thật

## Risks

- Backfill tắt nhầm dòng tồn 0 của món chủ shop mới tạo (spec mục 7, Q6): mức trung bình; có đường quay lại (bật bằng "Hiện cả…"); đếm trước trên dữ liệu thật do người chạy.
- App cũ tạo đơn/ghi tồn cho món tắt: giải bằng tự bật (Q5); cần test "đọc rồi lưu".
- Nhân viên đa chi nhánh thấy số nhỏ hơn sau PR 3 (riêng tư có chủ ý): kiểm iOS/Android trước, ghi vào PR.
- `UPDATE` backfill trên bảng lớn: chưa đo; chia lô nếu cần.
- Chuyển sang chi nhánh khác làm thiếu hàng cho đơn đã đặt ngày sau (không chặn, như sửa tồn tay).
- Gửi trùng khi mạng chậm: nút khoá khi đang gửi; chưa có khoá chống trùng (có thể thêm nếu thấy cần).
- Cả hai app điện thoại phải đủ chuỗi lỗi mới (mã lỗi lạ hiện thông điệp API, không phải chuỗi dịch).
- Production: không chạy migration thật, không gọi `api.anyrent.shop` trong suốt đợt này.

## Rollback

Gỡ code (revert PR); giữ cột `isListed` và bảng `StockTransfer` (vô hại, mặc định bật). App cũ không đọc cột nên không đổi. Tắt các màn trên điện thoại từ xa bằng `MOBILE_FEATURES` (bỏ khoá `branchProducts`). Dữ liệu `isListed` bị backfill tắt: bật lại bằng `PUT /api/products/listing` hoặc một `UPDATE` thủ công do người chạy.


Việc sau (không thuộc đợt này): mở quyền chuyển cho quản lý/kho; khi đó chỉ sửa `canTransferStock` và thêm ràng buộc chi nhánh gửi.