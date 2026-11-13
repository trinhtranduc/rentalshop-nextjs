# cột Merchant mới: profile, đăng nhập và email phải chọn cột đó

Status: active · Added: 2026-11-13 · Source: #1539 (e2e trước khi mở PR)

## Failure

`Merchant.language` (ngôn ngữ email) có trong DB, nhưng `db.users.findById` (GET /api/users/profile) không chọn cột đó. Profile luôn trả `language: 'vi'`; Cài đặt hiện "Tiếng Việt" cho shop `en`, nên
chủ shop không đổi được. Unit test đưa `language` vào mock của các hàm này nên vẫn xanh. Cùng loại với #1138 / #1199 (`settings`).

## Detect

```bash
cd tests && yarn test packages/database/user-find-by-email-language api/merchant-language-setting
```

## Pass

- `db.users.findById` chọn `merchant.language`; `db.users.findByEmail` chọn `merchant: { id, name, language }`.
- Profile của shop `en` trả `language: 'en'`; hàng không có cột trả `vi`. Dữ liệu đăng nhập không thêm key (golden #1459).

## Notes

AGENTS.md → "Things agents get wrong": dòng về cột Merchant mới và `select`. Khi thêm cột Merchant mà client đọc, grep
`select: {` trong `packages/database/src/user.ts`, `merchant.ts`, `subscription*.ts` và chạy e2e một lần qua API thật.
