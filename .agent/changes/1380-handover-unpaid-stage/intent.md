# Intent: "Còn đợt chưa thu" thay nút Giao đồ

Issue: #1380

Đơn thu cọc theo giai đoạn còn đợt chưa thu: nút "Giao đồ · thu …" ghi một số khác các dòng tiền (#1368), và bấm vào cũng không giao được (API chặn `INSTALLMENT_UNPAID_AT_PICKUP`). Chủ shop muốn trong lúc đó ẩn nút và hiện dòng "Còn đợt chưa thu".

Ràng buộc: không vai trò nào mất đường giao đồ; đơn không có đợt chưa thu không đổi; không đổi API, web. Phân tích đường thu và đường giao theo vai trò và chế độ cọc nằm trong issue.
