# Plan — #1128 (xếp trên #1127)
1. Test đỏ: `tests/api/public-image-search.test.ts` (route), `tests/web-public-image-search.test.ts` (helper web), `tests/api/public-products-booking-flags.test.ts` thêm cờ.
2. API: `apps/api/lib/public-image-search.ts` + route `apps/api/app/api/public/[tenantKey]/search-by-image/route.ts`; cờ trong public products; `IMAGE_SEARCH_RATE_LIMITED` ở `locales/{en,vi,ja,ko,zh}/errors.json`; dòng `.agent/api-changes/LOG.md`.
3. Web: `packages/utils/src/api/public-image-search.ts`; `apps/client/app/[tenantKey]/products/lib/image-search.ts`; `components/ImageSearchPanel.tsx`; nối vào `PublicProductGrid` / `page.tsx`; chuỗi vi/en.
4. Kiểm: jest (2 TZ), tsc/eslint file sửa, build client, e2e Chrome có cửa sổ trên API local (embedding giả nếu không chạy được Python/Qdrant).
