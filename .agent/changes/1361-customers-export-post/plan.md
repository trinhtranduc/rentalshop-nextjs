# Plan

Issue: #1361 · Status: in-progress

1. Test đỏ (`bug-fix-tdd`): `tests/api/customers-export-post.test.ts` (POST 3.000 mã, quyền, phạm vi, giới hạn, POST = GET, GET không đổi) và `tests/packages/utils/customers-export-request.test.ts` (POST thân JSON, URL không chứa mã). Commit riêng.
2. Tách `apps/api/lib/customers-export.ts` từ `GET`, thêm `POST` (zod) trong `apps/api/app/api/customers/export/route.ts`.
3. `exportCustomers` trong `packages/utils/src/api/customers.ts`: `POST` khi có mã.
4. Dòng `.agent/api-changes/LOG.md` (status `dev`).
5. Kiểm: jest (`TZ=UTC`, `TZ=Asia/Ho_Chi_Minh`), tsc api và client trước / sau, eslint, e2e API với ~3.000 khách trên DB cục bộ riêng, web Chrome có đầu.

Skills: `bug-fix-tdd`, `api-route-standard`, `api-compat-review`, `verify-change`, `review-pr`. `i18n-keys`: không chuỗi mới.
