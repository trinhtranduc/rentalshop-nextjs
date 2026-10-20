# Intent — #1128 khách tìm sản phẩm bằng hình ảnh trên trang shop công khai

**Muốn gì:** trên trang shop công khai (`/{tenantKey}/products`), khách (không đăng nhập) gửi ảnh mẫu và thấy ngay các sản phẩm giống nhất của shop. Mục tiêu của chủ shop (2026-10-20): giới thiệu chức năng AI tìm bằng hình ảnh.
**Ràng buộc:** chỉ thêm (route công khai mới, cờ mới trong response public products); không giá vốn, không CUID; không lưu ảnh khách; giới hạn lượt vì mỗi lượt gọi Python embedding service; app iOS/Android không đổi. Mockup: tab "AI tìm bằng ảnh: giới thiệu", phần B.
**Ngoài phạm vi:** 10 ngôn ngữ còn lại (đợt dịch trang shop), landing page (phần A).
