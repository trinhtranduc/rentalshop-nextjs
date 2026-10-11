# #800 — sửa add-on

Admin sửa được add-on (số lượng, ghi chú, bật/tắt). `PUT /api/plan-limit-addons/[id]` lấy `id` từ URL, không đòi `id` trong body. Không đổi create/delete, không đổi cách add-on tính vào giới hạn. Chỉ web admin gọi route này.
