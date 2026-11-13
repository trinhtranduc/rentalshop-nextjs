# Plan — #1551

Status: in-review

1. Test trước (commit riêng, fail): `tests/web-register-landing-locale.test.ts` — hàm `registerLocaleFromLanding` và middleware
   (mock `next/server` như `web-landing-middleware.test.ts`), matcher.
2. `apps/client/lib/public-content/shop-locale.ts`: `registerLocaleFromLanding`.
3. `apps/client/middleware.ts`: nhánh `/register*` trước các nhánh landing; matcher thêm `/register`, `/register/:path*`.
4. Kiểm tra (skill `verify-change`):
   - `yarn --cwd tests test web-register-landing-locale web-landing-middleware web-signup-prefs` (TZ=UTC và Asia/Ho_Chi_Minh)
   - `npx tsc --noEmit -p apps/client/tsconfig.json` (so với dev)
   - Chrome có cửa sổ, web local: landing `/en` → `/register` ra `lang="en"` và dòng nhắc English; cookie `NEXT_LOCALE=en`;
     đã có `NEXT_LOCALE=vi` thì giữ `vi`; không có cookie landing thì `vi`.
