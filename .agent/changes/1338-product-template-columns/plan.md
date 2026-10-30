# Plan — Ẩn Pricing Type và Duration Config khỏi file mẫu sản phẩm

Issue: #1338 · Status: in-progress · Spec: ./spec.md

## Steps

1. Thêm `tests/product-import-template.test.ts` (đọc file mẫu bằng `xlsx`, `mapHeaders`, `validateProducts`); commit test đỏ.
2. Gỡ hai cột và hai giá trị mẫu khỏi `generateProductSampleFile()`.
3. Thêm dòng vào `.agent/api-changes/LOG.md`.
4. Skill áp dụng: `api-compat-review` (hai lần), `verify-change`.
5. Verify: `cd tests && yarn test product-import-template web-products-model`.

## Files

- `packages/utils/src/import/sample-generator.ts` — bỏ hai cột và hai giá trị mẫu
- `tests/product-import-template.test.ts` — test mới
- `.agent/api-changes/LOG.md` — một dòng

## Risks

Thấp: chỉ file mẫu. File cũ 11 cột vẫn nhập được (test).

## Rollback

Revert PR; file mẫu trở lại 11 cột.
