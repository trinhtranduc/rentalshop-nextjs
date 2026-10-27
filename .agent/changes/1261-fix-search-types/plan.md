# Plan #1261
1. Đỏ: `tsc --noEmit -p packages/database/tsconfig.json` báo TS2339 + TS2554 ở product.ts:51-52.
2. Sửa hai dòng trong product.ts.
3. Xanh: hai lỗi biến mất, không thêm lỗi mới; Jest `product-search` ở TZ=UTC và TZ=Asia/Ho_Chi_Minh.
4. Dòng LOG.md (không đổi hành vi), PR vào dev.
