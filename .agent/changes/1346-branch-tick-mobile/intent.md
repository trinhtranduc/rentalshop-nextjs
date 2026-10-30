# Ô tick "Hiện ở chi nhánh" trên iOS và Android (PR 1m của #1335)

Issue: #1346 · Author: Trinh Tran · Status: in-review · Created: 2026-10-30
Cha: `.agent/changes/1335-multi-outlet-products/` (intent, spec, plan; mockup tab "Sản phẩm theo chi nhánh": B1, B2, B5, B6)

## Problem

API và web đã có ô tick `OutletStock.isListed` (#1341, PR #1343) nhưng hai app điện thoại chưa dùng: danh sách sản phẩm và việc chọn món khi tạo đơn vẫn hiện mọi món của shop, chủ shop không tick / bỏ tick được trên điện thoại, và app chưa khai báo token `branch-listing` nên server sẽ tự bật lại món chủ shop vừa bỏ tick khi tạo đơn.

## Proposed outcome

1. Chủ shop (shop từ 2 chi nhánh active) có ô "Hiện ở chi nhánh" trong form thêm / sửa sản phẩm, tick / bỏ tick qua `PUT /api/products/listing`, dòng nhắc không chặn khi bỏ tick mà còn tồn / đang thuê.
2. Quản lý, kho, nhân viên thấy ô của chi nhánh mình ở dạng mờ, chỉ xem, "Chỉ chủ shop bật/tắt".
3. Vai trò chi nhánh gọi danh sách sản phẩm với `listed=true`. Chủ shop xem mọi sản phẩm (không gửi `listed`); món chưa tick ở chi nhánh đang chọn có nhãn "Chưa hiện ở chi nhánh này" và không thêm vào giỏ được.
4. Mọi request của app mới gửi `X-Client-Capabilities` có token `branch-listing`.
5. Shop một chi nhánh và gói Basic: không có ô tick, không gửi `listed`.
6. Hàm thuần có test trước, trên iOS và Android giống nhau.

## Affected users and systems

Chủ shop, quản lý, kho, nhân viên; iOS `apps/mobile`, Android `apps/mobile-android`. Không đổi API.

## Constraints

- Không đổi API; app cũ trên `main-real` không đổi (không gửi `listed`, không gửi token).
- iOS là chuẩn, Android giống iOS. UI tối thiểu theo mockup, không màn mới.
- Không làm: "chi nhánh khác còn N" (PR 2m), khối "Các chi nhánh khác" (PR 5), cảnh báo tồn, nút "Hiện cả sản phẩm chi nhánh chưa có".

## Open questions

Không (mặc định trong `spec.md` mục "Chỗ lệch mockup").

## Decision log

- 2026-10-30 — Chỉ MERCHANT tick / bỏ tick; bỏ tick không bị chặn; chủ shop xem mọi sản phẩm kèm nhãn; vai trò chi nhánh gửi `listed=true` (chủ shop, theo `1335/spec.md` quy tắc 6, 10-12, 28).
