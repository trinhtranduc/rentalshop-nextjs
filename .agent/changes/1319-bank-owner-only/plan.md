# Plan (#1319)

Status: in-progress (PR open).

1. Đăng rà app cũ lên issue (xong, trước khi code).
2. Test trước, commit khi còn đỏ: `tests/api/bank-accounts-owner-only.test.ts`, `tests/packages/auth`, `SS-BNK` trong `settings-sync.e2e.test.js`, `BankQRTests.swift`, `BankAccountRulesTest.kt`. Dòng LOG `planned`.
3. API + `ROLE_PERMISSIONS`.
4. iOS, rồi Android theo iOS. Chuỗi mới vào en và vi.
5. Web.
6. Cập nhật kịch bản e2e mobile và tài liệu (`SETTINGS_SYNC*.md`, `TEST_CASES.md`).
7. `verify-change`: jest, business e2e, lint, type-check, build iOS và Android, e2e giao diện có cửa sổ.
8. Rà lần 2 trên diff thật, PR vào `dev`.

Skill: `api-route-standard`, `api-compat-review`, `mobile-parity`, `i18n-keys`, `verify-change`.
