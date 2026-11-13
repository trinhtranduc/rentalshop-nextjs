# Plan — #1539

Status: accepted

1. Test trước (fail):
   - `tests/api/register-signup-prefs.test.ts` (1-6): hai route đăng ký với / không `language`, `currency`, `country`;
     kiểm `merchant.create` data, dữ liệu mẫu, `sendVerificationEmail` locale.
   - `tests/api/settings-merchant-language.test.ts` (7).
   - `tests/api/auth-email-language.test.ts` (10): quên mật khẩu, gửi lại xác thực theo `merchant.language`.
   - `tests/utils/auth-email-locale.test.ts` (9): tiêu đề / nội dung vi, en.
   - `tests/web-signup-prefs.test.ts` (11-13): `signupDefaults(country)`, danh sách quốc gia (VN đầu, tên theo ngôn ngữ), payload.
2. `prisma/schema.prisma`: `Merchant.language String?`; migration `add_merchant_language` (skill `db-migration`).
3. API: `apps/api/lib/signup-prefs.ts` (luật 2-4), hai route đăng ký, `registerSchema` / `merchantGoogleRegisterSchema`
   thêm `language`, `currency`; `PUT /api/settings/merchant` + profile (`language`); `db.users.findByEmail` chọn
   `merchant.language`; các route gửi email truyền `locale`. Skill `api-route-standard`, `api-compat-review`.
4. Email: `packages/utils/src/services/email.ts` + `locales/*/email.json` mục `verification`, `passwordReset` (5 ngôn ngữ). Skill `i18n-keys`.
5. Web: `packages/constants` danh sách mã quốc gia; `packages/ui` RegisterForm (3 ô + payload + đặt ngôn ngữ web);
   `apps/client` Cài đặt (Ngôn ngữ email). Khoá dịch `auth.json`, `settings.json` 5 ngôn ngữ.
6. `.agent/api-changes/LOG.md`: dòng #1539.
7. Verify: test liên quan (2 múi giờ), toàn bộ `tests/` so với baseline, type-check client + API, lint file sửa,
   áp migration (psql) lên DB e2e local, e2e Chrome có cửa sổ: đăng ký Việt Nam (mặc định) và Mỹ → DB `country`,
   `currency`, `language`, tên chi nhánh mẫu; ngôn ngữ web sau đăng ký; email xác thực (log provider console) đúng ngôn ngữ;
   Cài đặt đổi Ngôn ngữ email → profile; khổ 390px.
