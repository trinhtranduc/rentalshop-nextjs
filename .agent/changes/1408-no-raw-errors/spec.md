# Spec

1. `authenticateRequest`: lỗi Prisma (theo `name` hoặc code `P1234`) trả 503 `SERVICE_UNAVAILABLE`. Lỗi khác có chữ `subscription` giữ 403 `SUBSCRIPTION_ERROR` nhưng dùng câu catalog. Còn lại giữ 401.
2. `errorFormat: 'minimal'` cho Prisma client ở mọi môi trường.
3. Mọi response xây từ exception: câu catalog hoặc câu cố định, giữ key và status. Dòng báo cáo (bulk import, batch delete, sync admin) giữ câu nghiệp vụ ngắn qua `clientSafeErrorText`.
4. Mã nghiệp vụ loyalty truyền qua `message` vẫn giữ nguyên nếu là `SNAKE_CASE`.
5. iOS, Android: `ServerMessageGuard` (dài hơn 400 ký tự hoặc có dấu hiệu kỹ thuật) dùng ở nơi tạo lỗi từ text server và nơi hiện alert. Chấm công: câu "thử lại" riêng. Không có chuỗi mới.
