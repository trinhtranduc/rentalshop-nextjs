# Spec — #1536

Status: in-progress

## API (`GET /api/products`)

1. `categoryIds=3,7`: chỉ sản phẩm thuộc danh mục 3 hoặc 7, vẫn trong phạm vi shop / chi nhánh của người gọi.
2. Phần tử không phải số nguyên dương trong `categoryIds` bị bỏ; không còn id nào → như không gửi.
3. Gửi cả `categoryId` và `categoryIds`: dùng `categoryIds`.
4. Chỉ `categoryId`: như cũ.

## Web (`/products`)

5. URL `category=3,7` → `categoryIds: [3, 7]` (bỏ trùng, bỏ giá trị sai, giữ thứ tự); `category=3` → `[3]`; không có → `[]`.
6. Bộ lọc gửi API: 0 danh mục → không gửi; 1 → `categoryId`; 2+ → `categoryIds` (chuỗi cách dấu phẩy, do `searchProducts` ghép).
7. `filterKey` đổi khi danh sách danh mục đổi.
8. Ô "Danh mục": nút ghi "Tất cả" / tên danh mục / "N danh mục"; mở ra "Tất cả danh mục" + mỗi danh mục một ô tích kèm số sản phẩm; tích / bỏ cập nhật URL ngay, về trang 1, danh sách vẫn mở; Esc hoặc bấm ra ngoài thì đóng; có ô tìm khi > 8 danh mục.
9. Bỏ hàng chip danh mục; thanh công cụ không cuộn ngang.
10. Tìm bằng ảnh nhận danh mục chỉ khi chọn đúng 1.
11. Khổ 390px không tràn ngang.

## Out of scope

Điện thoại, admin, lưu bộ lọc, lọc danh mục ở màn khác (đơn hàng, nhãn).
