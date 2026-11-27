# Intent #1688: huỷ được đơn thuê đã trả

Chủ shop: đơn chỉ xoá được khi đã huỷ (`DELETE /api/orders/[orderId]`), nhưng đơn thuê đã trả (`RETURNED`) không huỷ được nên không bao giờ xoá được. Muốn thêm `RETURNED → CANCELLED` để huỷ rồi xoá.

Ràng buộc:
- Quy tắc tiền: **như huỷ hiện nay**, không thêm logic mới (chủ shop chốt 27/11/2026).
- Chỉ MERCHANT và OUTLET_ADMIN (trong chi nhánh mình) và vai trò hệ thống; nhân viên (`isStaffLikeRole`) không.
- App iOS/Android đã cài: không đổi (chúng không hiện nút Huỷ ở `RETURNED`).
