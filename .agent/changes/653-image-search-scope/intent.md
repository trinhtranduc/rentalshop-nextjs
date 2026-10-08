# Intent — #653 image search scope

**What:** `POST /api/products/searchByImage` must not show `costPrice` to users without `products.manage`
(OUTLET_STAFF), and its cache must not serve one caller's filtered, cut or stale list to another.

**Why:** production leak of cost prices to staff; staff of outlet A can see outlet B products from a cache hit;
`limit` / `minSimilarity` ignored on cache hits; deleted / deactivated products served for up to 1 h.

**Constraints:** installed iOS / Android apps cannot be force-updated: additive / narrowing only, `costPrice`
must already be optional in both decoders. Response shape (`products`, `total`, `debug.cacheHit`, durations) unchanged.
No Python service or Qdrant change.
