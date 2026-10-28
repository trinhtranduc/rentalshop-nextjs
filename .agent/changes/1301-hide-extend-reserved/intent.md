# Ẩn Gia hạn ở đơn Đã đặt

Issue: #1301 · Status: draft

## Vấn đề
Sheet ⋯ của đơn Đã đặt (RESERVED) vẫn có "Gia hạn" dù đơn chưa lấy hàng. Owner muốn Gia hạn chỉ hiện khi đơn đang thuê (mockup hình 38.1).

## Kết quả mong muốn
`canExtend` đúng chỉ với đơn RENT + PICKUPED + có quyền sửa đơn, trên iOS và Android.

## Ràng buộc
Không đổi API, web, chuỗi. App cũ vẫn gọi được API như cũ.
