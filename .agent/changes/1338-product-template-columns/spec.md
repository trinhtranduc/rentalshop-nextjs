# Spec — Ẩn Pricing Type và Duration Config khỏi file mẫu sản phẩm

Issue: #1338 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `generateProductSampleFile()` trả workbook một sheet `Products`, hàng tiêu đề đúng 9 cột theo thứ tự: `Name, Description, Barcode, Category Name, Rent Price, Sale Price, Cost Price, Deposit, Stock`.
2. Không có cột `Pricing Type (FIXED/HOURLY/DAILY)` và `Duration Config (JSON string)`; 3 dòng ví dụ không có giá trị của chúng.
3. File CŨ đủ 11 cột: `mapHeaders` (web) vẫn map đúng 9 cột đầu và bỏ qua hai cột còn lại; `validateProducts` vẫn nhận `pricingType`/`durationConfig`.
4. File MỚI 9 cột: `mapHeaders` map đủ 9 trường; `validateProducts` chấp nhận dòng không có `pricingType`/`durationConfig`; route nhập ghi `pricingType: null`, `durationConfig: null` (`bulk-import/route.ts:202-203,514-515`).

## Out of scope

- Validator, route nhập, `mapHeaders`, `ImportInstructions.tsx`, nhãn `pricingTypeOptional` của form sản phẩm.
- Spec #1335 (nhập Excel chọn chi nhánh): độc lập.

## API and data

`GET /api/import/sample/products` trả `.xlsx` ít hơn hai cột cuối. Không đổi JSON, schema, locales. Không app nào parse cột của file mẫu.

## Acceptance

- [ ] Behavior 1-4 có test trong `tests/product-import-template.test.ts`
- [ ] Test đỏ trước khi sửa (commit riêng)
- [ ] iOS/Android: không gọi route này, không đổi
- [ ] Không chuỗi mới, không đổi locales
