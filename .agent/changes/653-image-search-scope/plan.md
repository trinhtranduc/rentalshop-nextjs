# Plan — #653

1. `tests/api/image-search-scope.test.ts`: route test, embedding + vector store + db mocked, real cache module.
   Cases (a) costPrice by permission, (b) outlet A / B on a cache hit, (c) deleted / deactivated after cache,
   (d) limit and minSimilarity on the cache. Commit alone.
2. `apps/api/lib/image-search-cache.ts`: typed `getCachedSearchHits` / `cacheSearchHits` (key includes minSimilarity).
3. `apps/api/app/api/products/searchByImage/route.ts`: resolve hits (cache or embed+search), then shared
   hydrate → filter → limit → map(canViewCostPrice).
4. Verify (tests TZ=UTC and Asia/Ho_Chi_Minh, tsc on changed files, lint), LOG.md row, TEST_CASES.md note, PR to dev.
