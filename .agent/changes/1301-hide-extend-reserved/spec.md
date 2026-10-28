# Spec
- iOS `RentalExtension.canExtend` và Android `RentalExtension.canExtend`: chỉ `PICKUPED` (Android giữ alias `PICKED_UP`).
- Mọi điểm vào dùng chung hàm này (chỉ có sheet ⋯ ở chi tiết đơn).
- RESERVED, RETURNED, CANCELLED, SALE: không có Gia hạn. Đổi ngày đơn đã đặt dùng "Sửa đơn".
- Test: RESERVED false; PICKUPED true; các trạng thái khác như cũ.
