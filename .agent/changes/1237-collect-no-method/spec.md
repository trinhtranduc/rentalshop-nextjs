# Spec #1237
- Sheet/dialog "Thu giai đoạn N" (iOS, Android, web) không còn chọn Tiền mặt / Chuyển khoản.
- Khối giai đoạn chưa thu khi giao đồ (web) không còn ô chọn phương thức.
- Request collect luôn gửi `method: "CASH"`; `reference` (khoá chống thu trùng) giữ nguyên.
- Không đổi: API, thanh toán thường của đơn, bước tạo kế hoạch cọc, khoá i18n.
- API compatibility: không đổi.
- Mở rộng (chủ: "tiếp tục"): bước "Thu ngay giai đoạn 1" khi tạo đơn (giỏ hàng iOS/Android, `StagePlanPanel` web) chỉ còn hai lựa chọn "Thu ngay" (gửi CASH) và "Không thu ngay"; bỏ Chuyển khoản/Check.
