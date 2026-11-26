# Plan (#1665)

1. `prisma/schema.prisma`: model `SeoConnectorKey` (`key` unique, `status`, `response` Json, `createdAt`). Bản nháp SQL `migration.sql` cùng thư mục; **chủ shop đặt** vào `prisma/migrations/<ts>_seo_connector_key/` (hook chặn agent).
2. `apps/api/lib/seo-connector/`: `security.ts` (khoá), `html-to-tiptap.ts`, `handler.ts`; `apps/api/app/api/seo-connector/[[...path]]/route.ts`; `apps/api/middleware.ts` (public); `apps/api/package.json` (`htmlparser2`, lockfile không đổi vì đã có `htmlparser2@^8.0.2`).
3. `apps/client/next.config.js`: rewrite `/api/seo-connector` và `/api/seo-connector/:path*` sang `NEXT_PUBLIC_API_URL`.
4. `env.example`: `SEO_CONNECTOR_KEY_SHA256`, `SEO_CONNECTOR_AUTHOR_ID`, `SEO_SITE_URL`.
5. `.agent/api-changes/LOG.md`: dòng #1665 `planned`.
6. Test: hai file ở spec; `cd tests && TZ=UTC yarn test seo-connector` và `TZ=Asia/Ho_Chi_Minh`.
7. Chạy thật: DB e2e riêng, API local, `CONNECTOR_KEY=... pnpm connector:check http://localhost:3197 --write` trong repo Hub; xem nháp trong DB không lộ ở API công khai.

## Chủ shop làm sau khi merge
- Đặt trên Railway (service `apis`): `SEO_CONNECTOR_KEY_SHA256`, `SEO_CONNECTOR_AUTHOR_ID`; đặt file migration; build lại web để có rewrite.
- Dán khoá thật vào Hub (Cài đặt › Connector). Khoá thật do chủ shop tự sinh (`echo "sk_$(openssl rand -hex 32)"`), chỉ dấu vân SHA-256 vào Railway.

## Rollback
Revert PR. Bảng `SeoConnectorKey` và các nháp đã tạo giữ nguyên (nháp không công khai). Bỏ `SEO_CONNECTOR_KEY_SHA256` thì connector từ chối mọi lời gọi.
