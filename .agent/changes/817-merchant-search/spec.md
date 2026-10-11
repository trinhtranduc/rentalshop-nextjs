# Spec #817

- `buildMerchantSearchConditions(term, normalized)` (`packages/database/src/merchant-search.ts`, thuần) trả điều kiện Prisma `OR`: name, email, phone của merchant; và `users.some({ role MERCHANT, deletedAt null, OR firstName/lastName/email/phone })`.
- Số điện thoại: bỏ khoảng trắng, `.`, `-`, `(`, `)`; thêm biến thể bỏ số 0 đầu (khớp +84 / 84) khi từ khoá có >= 6 chữ số.
- Tên: thêm bản không dấu như hiện tại.
- `merchant.ts` search dùng hàm này. Placeholder `MerchantFilters`: "Search by shop name, phone, email or owner...".
- Test: `tests/packages/database/merchant-search.test.ts`.
