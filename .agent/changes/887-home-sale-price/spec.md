# Spec

- Home row price line, product with a rent price and a sale price > 0:
  `<main>/lần · <second>/ngày · bán <sale>` (vi), `… · sale <sale>` (en). Reuses the existing
  `products.price.saleShort` / `v2_price_sale_short` key. Muted, like the second price.
- Sale-only product: unchanged (`bán <sale>`). No sale price or 0: unchanged.
- Line limit unchanged (2 lines, tail truncation), as today.
- Data: the edit form keeps the sale price when the field is not touched (prefill from `salePrice` or legacy `sale_price`).
- Giá vốn (`costPrice`): detail meta line shows "Giá vốn <price>" when > 0 and the role may see prices
  (`showsPriceFields`; never OUTLET_STAFF; the API returns it only with `products.manage`). The v2 form has an
  optional "Giá vốn" field under the prices, prefilled. On save: the typed value; an empty field sends 0 only when the
  product had a cost (cleared on purpose), otherwise nothing, so a product read without `costPrice` keeps it.
- Today's update sends `costPrice: nil`, which `toFormData` drops; the API updates only defined fields — no wipe.
