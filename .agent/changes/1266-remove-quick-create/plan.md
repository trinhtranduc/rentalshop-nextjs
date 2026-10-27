# Plan #1266

1. Web: bỏ khối Tạo nhanh trong `BlockSetupDialog.tsx`, `quickTable` trong `block-draft.ts`, khoá `form.block.quick*`, test.
2. iOS: bỏ link + `quickTapped`, `BlockPricing.quickTable`, chuỗi `block.quick*`, test; sửa UI test 7r.
3. Android: bỏ nút + `QuickTableDialog`, `PriceForm.quickTable`, chuỗi `block_quick*`, test.
4. Cập nhật spec 1249; kiểm Jest, tsc, iOS unit + UI, Android unit; chụp ảnh trước/sau.
