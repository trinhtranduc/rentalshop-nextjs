# Intent #830 — admin chi nhánh và kho xem tồn chi nhánh khác (chỉ xem)

Refs #823 (câu 6, chủ shop chốt 2026-10-11).

- **Ai:** OUTLET_ADMIN và OUTLET_INVENTORY của shop nhiều chi nhánh.
- **Muốn:** khi khách hỏi món chi nhánh mình hết, biết ngay chi nhánh nào còn (tồn, còn, đang thuê) để chuyển khách hoặc điều hàng.
- **Ràng buộc:** chỉ xem; ghi tồn vẫn chỉ chi nhánh mình; "còn hôm nay" của danh sách vẫn tính chi nhánh mình (#837).
  OUTLET_STAFF chỉ thấy chi nhánh mình; MERCHANT như cũ. API chỉ thêm field (app iOS/Android chưa có bản phát hành có người dùng).
