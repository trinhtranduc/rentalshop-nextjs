# Plan

1. Chụp từng màn trước khi sửa (iPhone SE 3, Android 360dp, web 360px; VI và EN) trên DB seed local.
2. iOS: `WrappingLabel` (nhãn nhiều dòng tự đo lại chiều cao), áp dụng ở thẻ cọc, giỏ hàng, Tổng quan; chip dài xuống dòng ở Việc cần làm; tiêu đề nhóm; nút chính ở chi tiết đơn; ô tên mẫu; V2ValueRow `wrapsValue` cho hàng chỉ đọc.
3. Android: bỏ `maxLines = 1`, `V2ValueRow(wrapValue)`, tiêu đề nhóm, nút chính 2 dòng, ô tên mẫu.
4. Web: đổi `truncate` thành `break-words`.
5. Chụp lại sau khi sửa; chạy test iOS, Android, Jest.
