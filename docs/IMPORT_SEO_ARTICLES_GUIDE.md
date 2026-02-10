# Hướng Dẫn Import SEO Articles vào Database

## Tổng Quan

Đã tạo thành công **30 bài SEO articles** (10 bài ban đầu + 20 bài mới):
- ✅ Tất cả bài đều có nội dung song ngữ (Tiếng Việt + Tiếng Anh)
- ✅ Mỗi bài >2000 từ
- ✅ Đầy đủ SEO metadata (title, description, keywords)
- ✅ Image placeholders với alt text
- ✅ Format TipTap JSON

## Files Đã Tạo

### Articles (30 files)
- `docs/seo-articles/article-1-*.json` đến `article-30-*.json`

### Scripts
- `scripts/generate-20-new-articles.js` - Đã chạy, tạo 20 bài mới
- `scripts/import-seo-articles.js` - Script import tất cả articles vào database

## Cách Import vào Database

### Bước 1: Đảm Bảo Database Connection

Script cần `DATABASE_URL` environment variable. Có 2 cách:

**Cách 1: Sử dụng .env file**
```bash
# Đảm bảo file .env có DATABASE_URL
DATABASE_URL="postgresql://..."
```

**Cách 2: Set environment variable trực tiếp**
```bash
export DATABASE_URL="postgresql://..."
node scripts/import-seo-articles.js
```

### Bước 2: Chạy Import Script

```bash
node scripts/import-seo-articles.js
```

Script sẽ:
1. ✅ Tìm admin user trong database
2. ✅ Tạo categories và tags nếu chưa có
3. ✅ Import tất cả 30 articles (cả tiếng Việt và tiếng Anh)
4. ✅ Set status = DRAFT để review

### Bước 3: Review và Publish

1. Vào admin panel: `/posts`
2. Review các articles (đang ở status DRAFT)
3. Kiểm tra SEO metadata
4. Thay thế image placeholders bằng hình ảnh thực tế
5. Publish articles khi sẵn sàng

## Danh Sách 30 Articles

### 10 Articles Ban Đầu (1-10)
1. Hướng Dẫn Bắt Đầu Kinh Doanh Cho Thuê
2. Quản Lý Kho Hàng Cho Cửa Hàng Cho Thuê
3. Quản Lý Quan Hệ Khách Hàng
4. Tối Ưu Hóa Quy Trình Đặt Hàng & Thanh Toán
5. Quản Lý Lịch & Lên Lịch Cho Thuê
6. Báo Cáo Tài Chính & Phân Tích Kinh Doanh
7. Quản Lý Đa Chi Nhánh
8. Tối Ưu Hóa Giá Cả & Chiến Lược Định Giá
9. Chiến Lược Marketing & Quảng Cáo
10. Giới Thiệu Tính Năng AnyRent

### 20 Articles Mới (11-30)
11. Cách Chọn Sản Phẩm Cho Thuê Phù Hợp
12. Quản Lý Rủi Ro Trong Kinh Doanh Cho Thuê
13. Tối Ưu Hóa Không Gian Cửa Hàng Cho Thuê
14. Xây Dựng Thương Hiệu Cho Cửa Hàng Cho Thuê
15. Quản Lý Nhân Sự Cho Cửa Hàng Cho Thuê
16. Chiến Lược Giữ Chân Khách Hàng
17. Tối Ưu Hóa Quy Trình Kiểm Tra & Bảo Dưỡng
18. Xử Lý Khiếu Nại & Tranh Chấp
19. Phân Tích Đối Thủ Cạnh Tranh
20. Tăng Trưởng Doanh Thu - 10 Chiến Lược
21. Quản Lý Mùa Vụ & Nhu Cầu Biến Động
22. Tích Hợp Công Nghệ Số - Xu Hướng 2025
23. Quản Lý Hợp Đồng Cho Thuê Chuyên Nghiệp
24. Chiến Lược Giá Cả Theo Mùa
25. Xây Dựng Hệ Thống Đánh Giá & Feedback
26. Quản Lý Tài Chính & Kế Toán
27. Tối Ưu Hóa Trải Nghiệm Khách Hàng
28. Quản Lý Chuỗi Cung Ứng
29. Mở Rộng Quy Mô Kinh Doanh Cho Thuê
30. Bảo Mật & An Toàn Dữ Liệu

## Lưu Ý

- Tất cả articles được tạo với status = DRAFT
- Mỗi article có 2 versions: Tiếng Việt (locale='vi') và Tiếng Anh (locale='en')
- Image placeholders cần được thay thế bằng hình ảnh thực tế
- Internal linking giữa các articles có thể được thêm sau

## Troubleshooting

### Lỗi: DATABASE_URL not found
- Đảm bảo file `.env` có DATABASE_URL
- Hoặc set environment variable trước khi chạy script

### Lỗi: No admin user found
- Chạy script tạo admin: `node scripts/create-super-admin.js`
- Hoặc đảm bảo có ít nhất 1 user với role='ADMIN' trong database

### Articles không import được
- Kiểm tra file JSON có đúng format không
- Kiểm tra slug có bị trùng không
- Xem log để biết lỗi cụ thể
