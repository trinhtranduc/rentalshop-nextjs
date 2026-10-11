# #825 — sản phẩm theo chi nhánh

Phần của #823. Tồn kho chỉ ghi vào chi nhánh cùng shop với sản phẩm (lỗ hổng chéo shop ở `PUT /api/products/[id]`).
Tên, giá, ảnh, danh mục, mô tả... là dữ liệu dùng chung: chỉ MERCHANT (và ADMIN) sửa; role chi nhánh chỉ sửa tồn
chi nhánh mình và không xóa sản phẩm. Sản phẩm mới có dòng tồn 0 ở các chi nhánh active còn lại.
App iOS/Android chưa có bản phát hành có người dùng (#823).
