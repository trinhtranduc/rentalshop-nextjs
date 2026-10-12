# #887 — Home list hides the sale price of a product that also rents

**What:** customers report "after updating the app the sale price is gone". Since #681 the Home row shows the sale
price only for a sale-only product; a product that rents and sells loses "bán <price>".
**Why:** shops rent and sell the same item (áo dài, vest); staff read the sale price off the Home list.
**Constraints:** no API change; iOS is the reference, Android matches; approved board `SP-dong`.

**Added (same issue):** customers also report "giá gốc không hiển thị": the v2 product detail and form never show
`costPrice` (Giá vốn), which the old form had.
