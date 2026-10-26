# Spec: giai đoạn cọc trong To do

Issue: #1231 · Status: in-progress

1. Với `installmentsOverdue` có N hàng, To do (nhóm TRỄ HẠN) thêm N hàng loại "Thu cọc"; sắp chung theo số ngày trễ giảm dần với các hàng trễ cũ.
2. Với `installmentsDue` có M hàng, nhóm HÔM NAY thêm M hàng "Thu cọc" sau các hàng lấy / trả.
3. `installmentsDueTomorrow` không tạo hàng nào; nhóm NGÀY MAI không đổi.
4. Badge (iOS, Android) = số hàng nhóm trễ + hôm nay, gồm cả hàng cọc.
5. Hàng cọc: tên khách, nhãn giai đoạn + số đơn, tiền còn thu, "Trễ N ngày" nếu trễ. Bấm mở chi tiết đơn.
6. Thiếu hai nhóm (client cũ, shop thu cọc 1 lần): To do y như trước.
7. Web: "Đơn hôm nay" có hàng cọc; thẻ "Cần thu hôm nay" bỏ; "Sắp đến hạn" giữ.
8. Ngoài phạm vi: email, push, đổi API, số đếm tab trên web.
