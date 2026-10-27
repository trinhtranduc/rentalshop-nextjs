# Spec

Giỏ thuê của shop "Thu cọc theo giai đoạn" (iOS, Android):
1. Sau "Tổng cộng", một nhóm có tiêu đề cùng kiểu MONEY: `deposit.cart.title` ("THU CỌC THEO GIAI ĐOẠN").
2. Dòng "Mẫu" (key mới `deposit.cart.template`): nhãn trái, tên mẫu phải (xanh, bấm đổi mẫu nếu được phép). Tên không bị cắt.
3. Các giai đoạn đánh số "1. ", "2. " ...: tên + dòng phụ ("30% · hôm nay" / "Thu khi giao · 15/10"), số tiền bên phải, giai đoạn sửa được có biểu tượng sửa. Không cắt tên.
4. Dòng "Thu giai đoạn 1 ngay" ở cuối nhóm, tách bằng đường kẻ đậm hơn / khoảng cách.
5. Phần trăm: `DepositPlanMath.stages` trả `percent` của mẫu khi `amountOverride == nil`; khi chủ sửa tay thì phần trăm tính ngược, làm tròn tối đa 1 số lẻ. Phần "rest" giữ nguyên.
6. Web (apps/client/app/orders/create): xem plan.

Không đổi API, payload, trường nào. Chức năng giữ nguyên.
