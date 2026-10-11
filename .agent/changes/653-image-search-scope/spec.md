# Spec — #653

1. `costPrice` is present in each product only when `hasPermission(user, 'products.manage')` (same rule as
   `GET /api/products`). Otherwise the key is absent.
2. The cache stores only vector hits `[{ productId, similarity }]`, keyed by
   `imageHash + merchantId + categoryId + minSimilarity`. The vector search fetches a fixed upper bound
   (independent of `limit`) so a cached entry serves any `limit` ≤ 100.
3. Every request (hit or miss) re-reads products with `db.products.findByIds`, drops missing / soft-deleted /
   `isActive === false`, keeps score order, applies the caller's outlet filter, then `limit`, then maps with the
   permission rule.
4. `debug.cacheHit` true on a hit (no embed / vector call), false on a miss. Codes `PRODUCTS_FOUND` /
   `NO_PRODUCTS_FOUND` unchanged.
