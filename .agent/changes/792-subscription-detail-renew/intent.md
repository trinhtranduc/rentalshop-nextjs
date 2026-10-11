# #792 — trang chi tiết subscription của admin

Admin phải gia hạn, sửa, tạm dừng, hủy và xóa subscription ngay trên trang chi tiết, kể cả trên điện thoại. Hiện bấm Renew không có, Back/Edit/Manage Addons ra 404, Suspend/Cancel không hiện, Delete báo lỗi hàm không tồn tại.

Ràng buộc: chỉ `apps/admin` và một helper client `subscriptionsApi.delete`; không đổi API; giữ nguyên các nút hiện có.
