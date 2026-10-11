# Home: prominent image search button

Issue: #651 · Status: accepted · Created: 2026-10-08 · Mockup: ./mockup-options.png (option B, right)

## Problem
On the new Home (Chọn sản phẩm) the image search is a small grey camera icon inside the search field, next to the barcode icon, with no label. Owner: users miss it ("option nên để ở home để user dễ dàng bấm tìm"); keep it compact (no extra row).

## Outcome (owner chose option B, 2026-10-08)
Mockup: `~/Downloads/anyrent-home-tim-bang-hinh/home-phuong-an-gon.png` (right phone), copied into the change folder.
- Search field placeholder: "Tìm tên, mã vạch hoặc chụp ảnh" (en: "Search name, barcode or take a photo").
- Order inside the field: magnifier · text · barcode icon (grey, unchanged) · camera button last: 38×38 rounded square, solid `#1D4ED8`, white camera icon, accessibility "Tìm bằng hình" / "Search by photo". Opens the existing image search screen.
- Same height as today; nothing else on Home changes. iOS and Android.

## API impact review
None (UI only).

