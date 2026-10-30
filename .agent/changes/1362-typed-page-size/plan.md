# Plan — Số dòng mỗi trang gõ được

Issue: #1362 · Status: done · Spec: ./spec.md

## Steps

1. Test đỏ: `tests/web-page-size.test.ts` (và sửa 3 test cũ đang khẳng định `25 -> 10`).
2. `apps/client/app/orders/page-size.ts` (hàm thuần) + tái xuất ở `orders-model`, `customers-model`, `products/list/list-model`, và các parser của outlets/categories/users.
3. `PageSizeControl` trong `apps/client/app/orders/list/page-size-control.tsx`, dùng trong `TableFooter`.
4. Chuỗi `footer.*` ở `locales/{en,vi,ja,ko,zh}` (namespace của TableFooter).
5. Kiểm: jest `web-*`, `locales-valid-json`, tsc client trước/sau, eslint, Chrome có đầu.
Skill: `i18n-keys`, `api-compat-review` (không đổi API).

## Files

- `apps/client/app/orders/{page-size.ts,orders-model.ts,list/parts.tsx,list/page-size-control.tsx}`, các `*-model.ts` khác, `locales/*`, `tests/web-*`.

## Risks

Chỉ giao diện. 3000 dòng có thể chậm: đo và báo.

## Rollback

Revert PR.
