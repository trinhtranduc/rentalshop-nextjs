# Intent: sửa 3 lỗi test chặn release (#1281)

- Vì sao: `dev` có 3 lỗi test (không phải lỗi ứng dụng) làm nhiễu kết quả trước khi release.
- Muốn: suite `product-deleted-filter` xanh, bỏ file test rỗng `eb-block-pricing.test.ts`, UI test iOS `test7qStagedDeposit` không phụ thuộc giá seed ngẫu nhiên.
- Ràng buộc: chỉ file test; không đổi code ứng dụng hay API; không lệnh production.
