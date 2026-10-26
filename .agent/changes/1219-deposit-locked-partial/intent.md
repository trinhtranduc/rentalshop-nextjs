# Intent — nhãn giai đoạn cọc đã khoá (#1219)

Issue: #1219 (liên quan #1199)

Chủ shop tăng tổng đơn RESERVED sau khi đã thu giai đoạn 1. Giai đoạn 1 đã thu đủ lúc thu nhưng hiện `PARTIAL`, làm nhân viên tưởng còn phải thu bù, trong khi hệ thống không cho thu thêm giai đoạn đó (phần chênh dồn vào "Còn lại khi nhận").

Ràng buộc: sửa tối thiểu, không đổi field API, không migration, không đổi chỉ mục, không hiển thị `futureInstallments` trên web.
Ca thứ hai (giao → revert → sửa tổng) đã kiểm: đúng, chỉ thêm test hồi quy.
