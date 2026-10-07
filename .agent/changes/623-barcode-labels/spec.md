# Spec — #623

1. `printSettings` (browser storage, read in try/catch, defaults when missing): `billWidth` 80 | 58 (default 80); `label` = preset `50x30` (default) | `40x30` | `35x22` | `2x35x22` | custom `{w,h}` mm (w 20–110, h 10–100).
2. Settings dialog tab **Máy in** (group "me", every role): two controls (bill paper, label size with custom W/H), saved immediately, a small preview box of the label size.
3. `/products/labels`: product search (existing products API, merchant/outlet scope as the products list), checkbox per product, copies input (1–99), "Chọn tất cả trên trang". Entry: button **In tem** on the products list header (and on product detail → opens with that product preselected via `?ids=`).
4. Preview shows the labels at real mm size (CSS mm). **In** prints only the labels: `@page { size: Wmm Hmm; margin: 0 }`, one label per page; `2x35x22` prints 2 labels side by side per 70×22 page.
5. Label: name (≤ 2 lines, ellipsis), Code128-B SVG barcode with quiet zone, human-readable code below. Barcode width scales to the label; bars stay crisp (`shape-rendering: crispEdges`).
6. Code128 encoder (pure, `apps/client/app/products/labels/code128.ts`): code set B for printable ASCII 32–126; a code outside that set → product treated as "mã không hợp lệ" and listed with the missing ones. Checksum correct (tests with known vectors).
7. Products with empty barcode are not printed; a note lists them (name + link `/products/{id}/edit`).
8. Bill (`orders/receipt`): slip width and `@page` use `billWidth` (80 → today's exact CSS; 58 → 58 mm with 3 mm side padding, font 11px).
9. i18n vi + en for every new string.

Out of scope: WebUSB/TSPL, generating barcodes, price/shop name on labels, mobile.
