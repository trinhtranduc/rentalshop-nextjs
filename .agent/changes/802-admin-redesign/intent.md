# #802 — thiết kế lại web admin

Chủ shop thích style của web portal (`apps/client`) và muốn áp dụng cho toàn bộ web admin. Chỉ `apps/admin`; web shop và mobile không đổi. Từng nhóm màn, nhiều PR nhỏ vào `dev`. Chỉ giao diện, không đổi API nên không có dòng trong `.agent/api-changes/LOG.md`. Màu chủ đạo: xanh dương (chủ shop chọn, 2026-10-11).

Thứ tự: 1 token, 2 khung trang, 3 danh sách, 4 chi tiết, 5 dialog và form, 6 dashboard.
