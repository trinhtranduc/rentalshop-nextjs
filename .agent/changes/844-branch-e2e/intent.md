# Intent #844 — e2e nghiệp vụ cho nhiều chi nhánh

Phần của #823. Các luật chi nhánh đã chốt và đã merge (#834 chi nhánh, #829/#837 sản phẩm, #831 add-on, #840 Tổng quan)
cần một bộ e2e API chạy cả 2 múi giờ, để lần sửa sau không làm hỏng mà không ai biết.

- Mỗi ca kiểm câu trả lời API và dữ liệu (Outlet, OutletStock, Product, Order, PlanLimitAddon), không chỉ mã trả về.
- Dữ liệu riêng cho từng nhóm (merchant, gói, chi nhánh, user), không dựa vào shop seed.
- Quy tắc xóa khi chi nhánh khác còn hàng (#847, đã merge): ca cho OUTLET_ADMIN và xóa nhiều.
- Ràng buộc: chỉ thêm test và tài liệu, không đổi API.
