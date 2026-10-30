# Sản phẩm khi shop có nhiều chi nhánh: ô tick "Hiện ở chi nhánh" và công cụ tồn nhiều chi nhánh

Issue: #1335 (PR spec: #1336) · Author: Trinh Tran · Status: draft (chờ chủ shop chốt mockup) · Created: 2026-10-30

Nền: báo cáo hiện trạng `~/AnyRent-builds/multi-outlet-products-current.md` (đọc từ `origin/dev` b4a535744; 16 mục không nhất quán, 8 câu hỏi).
Spec liên quan: #824 (luật chi nhánh), #825 (luật sản phẩm theo chi nhánh), #830 (tồn chi nhánh khác), #828 (chọn chi nhánh trên điện thoại), #851 (giữ chi nhánh của đơn), #1305 (biến thể, PR #1306 chưa chốt).

## Problem

Một shop nhiều chi nhánh dùng chung một danh mục sản phẩm, mỗi chi nhánh có tồn riêng (`OutletStock`). Từ #825, mọi sản phẩm có một dòng tồn ở mọi chi nhánh (tồn 0 nếu chưa nhập), nên:

- Chi nhánh nào cũng thấy hết mọi món, kể cả món mình không bán (`apps/api/app/api/products/route.ts:645-651`, `packages/database/src/product.ts:298-326`). Shop áo dài có nhiều mẫu riêng từng tiệm thì danh sách dài và lẫn.
- Không có chỗ nào nói "chi nhánh này có bán món này không". Chỉ đoán từ tồn thì không phân biệt được món bán hết (tồn 0, vẫn cần hiện để nhập lại hoặc sửa) với món chi nhánh không bán.
- Hết hàng ở chi nhánh này nhưng chi nhánh khác còn: lúc tạo đơn không có gợi ý; điện thoại không xem được tồn chi nhánh khác (`otherOutlets` chỉ có ở web).
- Không có chuyển hàng giữa chi nhánh; chủ shop sửa tồn tay ở hai chi nhánh (đợt này giữ cách đó). Trang quảng cáo ghi "Chuyển kho giữa các cửa hàng" (`apps/client/app/cho-thue-ao-dai/page.tsx:146`).
- API gửi thừa cho OUTLET_STAFF số tồn mọi chi nhánh và tổng cả shop; `totalStock` có thể lệch tổng các chi nhánh.
- Nhập Excel không chọn chi nhánh, không kiểm giới hạn gói.

## Proposed outcome

Kiểm được mà không cần người:

1. Mỗi cặp (sản phẩm, chi nhánh) có một ô tick `isListed` ("Hiện ở chi nhánh"). API và app dùng đúng cột này, không suy từ tồn.
2. `GET /api/products?listed=true&outletId=X` chỉ trả món đã bật ở X (kể cả tồn 0); không gửi `listed` thì trả như hôm nay.
3. Chi nhánh tạo sản phẩm thì bật ở đó; các chi nhánh khác tắt. Chủ shop bật/tắt mọi chi nhánh; quản lý và kho bật/tắt chi nhánh mình; nhân viên không.
4. Bỏ tick không có luật chặn (chủ shop đồng ý): chỉ ảnh hưởng danh sách và chọn món khi tạo đơn mới; còn tồn hoặc đang thuê thì chỉ hiện một dòng nhắc.
5. Hết hàng khi tạo đơn: chủ shop, quản lý, kho thấy "chi nhánh khác còn N" kèm tên chi nhánh; nhân viên chỉ thấy "Hết hàng".
6. OUTLET_STAFF không nhận `outletStock` của chi nhánh khác, `totalStock` hay `available` của cả shop.
7. App cũ trên `main-real` không đổi hành vi (xem `spec.md`, bảng `API compatibility`).

## Affected users and systems

- Vai trò: MERCHANT (chủ shop), OUTLET_ADMIN (quản lý chi nhánh), OUTLET_INVENTORY (kho), OUTLET_STAFF (nhân viên), ADMIN (nhân viên hệ thống, kiểm quyền như hôm nay).
- Gói: Basic (chỉ điện thoại, 1 chi nhánh) không thấy gì mới. Gói nhiều chi nhánh (Enterprise, hoặc gói có add-on chi nhánh, #826) dùng đầy đủ.
- Hệ thống: `apps/api` (products, orders, bulk-import, route mới), `prisma/` (cột `OutletStock.isListed`), `apps/client` (danh sách, form, chi tiết, tạo đơn, nhập Excel), iOS `apps/mobile` (chuẩn), Android `apps/mobile-android` (theo sau), `locales/{en,vi,ja,ko,zh}`.

## Constraints

- Chỉ thêm. Không xoá, đổi tên, đổi kiểu hay đổi nghĩa trường nào app cũ đọc (`AGENTS.md` API compatibility). `totalStock` giữ nghĩa "tổng mọi dòng tồn"; số mới là trường mới.
- Một sản phẩm, một giá cho cả shop. Một đơn một chi nhánh, không lấy hàng từ hai chi nhánh.
- Giữ khoá `(productId, outletId)` của `OutletStock` và bất biến của #1305 mục 4.4 (`OutletStock` vẫn là tổng; `totalStock = Σ OutletStock.stock`).
- Giữ quyền #825 (quản lý và kho cùng quyền sản phẩm; nhân viên không tạo/sửa dùng chung; ghi tồn chỉ chi nhánh mình), không có ngoại lệ.
- Migration chỉ thêm; không đụng production (hook `production-gate.sh`); quy tắc backfill phải đọc được bằng truy vấn chỉ đọc.
- Đơn giản và chuẩn (lời chủ shop). Không phiếu giao nhận, không giá theo chi nhánh, không tồn theo phiếu nhập/xuất ở đợt này.
- Chủ shop nói "chốt" mockup rồi mới code.

## Open questions

Xem `spec.md` mục 10 (mỗi câu có mặc định). Chủ shop chưa quyết:

- Câu quảng cáo "Chuyển kho giữa các cửa hàng" đổi thành câu nào (đề xuất "Quản lý tồn kho từng chi nhánh"; việc nhỏ riêng, không làm trong PR này).
- Tắt ô tick khi tồn còn > 0.

## Decision log

- 2026-10-30 — Sản phẩm dùng chung cả shop (một bản ghi `Product`), mỗi chi nhánh có tồn riêng (`OutletStock`). Giá chung, không giá theo chi nhánh. Một đơn thuộc đúng một chi nhánh, không lấy hàng từ hai chi nhánh. (chủ shop)
- 2026-10-30 — Ô tick "Hiện ở chi nhánh" cho từng cặp (sản phẩm, chi nhánh) là nguồn duy nhất cho "chi nhánh có bán món này không", không suy từ tồn; lý do: món bán hết hoặc tồn 0 vẫn phải hiện để nhập lại hoặc sửa. Mặc định: chi nhánh TẠO sản phẩm thì bật ở đó, các chi nhánh còn lại tắt. (chủ shop)
- 2026-10-30 — Danh sách và chọn sản phẩm khi tạo đơn của chi nhánh chỉ hiện món đã bật; bật mà tồn 0 vẫn hiện, ghi "Hết hàng"; có nút "Hiện cả sản phẩm chi nhánh chưa có"; chủ shop thấy mọi sản phẩm và tồn từng chi nhánh. (chủ shop)
- 2026-10-30 — Tắt ô tick chỉ khi chi nhánh không còn hàng đang thuê và không còn đơn mở (RESERVED/PICKUPED). Đề xuất thêm "tồn phải về 0": chờ chủ shop. (chủ shop + đề xuất)
- 2026-10-30 — Quyền giữ quyết định 11/10 (#825). Nhân viên chỉ thấy chi nhánh mình; chủ shop, quản lý, kho xem được tồn chi nhánh khác (chỉ đọc, cả điện thoại). Bật/tắt ô tick: chủ shop mọi chi nhánh, quản lý và kho chi nhánh mình, nhân viên không. (chủ shop)
- 2026-10-30 — Thêm ba việc theo thứ tự: (a) gợi ý "chi nhánh khác còn N" khi hết hàng lúc tạo đơn; (b) API không gửi thừa cho nhân viên, sửa `totalStock` lệch; (c) nhập Excel chọn chi nhánh và kiểm giới hạn gói. Câu "Chuyển kho giữa các cửa hàng" trên trang quảng cáo: chủ shop chưa chọn câu thay, không sửa trong PR này. (chủ shop)
- 2026-10-30 — Gói Basic chỉ điện thoại và 1 chi nhánh: các màn mới ẩn. (chủ shop)
- 2026-10-30 — Thứ tự với biến thể #1305: giữ khoá `(productId, outletId)`; ô tick ở cấp sản phẩm cha, biến thể theo ô tick của cha; không giả định `totalStock` khác tổng chi nhánh theo cách mâu thuẫn #1305 mục 4.2/4.4. (chủ shop chấp nhận đề xuất)

- 2026-10-30 — Chủ shop chỉnh hướng: ô chọn "Hiện ở chi nhánh" trong form (danh sách chi nhánh có ô tick, nghĩa của tick là `OutletStock.isListed`); mọi tình huống chặn bỏ tick gộp thành một dòng giải thích. (chủ shop)
- 2026-10-30 — BỎ HẲN "Chuyển sang chi nhánh khác" / chuyển kho khỏi đợt này (chủ shop chốt): dời hàng bằng ô tick + sửa số lượng (web: sửa tồn mọi chi nhánh trong một lần lưu; điện thoại: từng chi nhánh). Bỏ tick khi tồn > 0: chặn, phải đặt số lượng về 0 trước. Lịch sử thay đổi tồn nếu cần: làm sau cùng hướng phiếu nhập/xuất (`docs/TODO.md`). Tick / bỏ tick vẫn: chủ shop mọi chi nhánh, quản lý/kho chi nhánh mình, nhân viên chỉ xem. (chủ shop)
- 2026-10-30 — Chủ shop đồng ý 4 đề xuất sau kiểm vận hành (`stock-edit-vs-open-orders.md`): (1) ô tick bỏ MỌI luật chặn (không Q1, không `PRODUCT_LISTING_IN_USE`, không khoá), chỉ một dòng nhắc không chặn; tự tick cho đơn app cũ giữ nhưng chỉ app cũ; (2) việc sửa lỗi route admin `PUT /api/merchants/[id]/products/[productId]` (`renting` bị reset) đứng đầu kế hoạch; (3) cảnh báo mềm khi lưu tồn thấp hơn số đã đặt trước (R1): chủ shop CHỐT CHƯA CẦN, gỡ khỏi đợt này, ghi vào việc sau; (4) việc sau: tạm ngừng cho thuê theo ngày, lịch sử sửa tồn, rủi ro R3/R4/R5/R7/R8. (chủ shop)