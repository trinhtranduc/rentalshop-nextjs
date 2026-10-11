# #796 — lưu form Edit Subscription

Admin lưu được form Edit Subscription (trước đây luôn 422). `PUT /api/subscriptions/[id]` chỉ ghi các cột được phép sửa. Không đổi chu kỳ, giá, quy tắc đổi gói (#785). Chỉ web admin gọi route này.
