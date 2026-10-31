# Spec (#1400)

`stageToCollectBeforeHandOver` = `nextToCollect` khi `blocksHandOver` đúng, ngược lại không có.

1. Có đợt: thanh dưới có "In" và nút chính "Thu giai đoạn N", mở `CollectInstallmentSheet`.
2. Thu xong: tải lại như hiện nay, không tự mở sheet giao đồ.
3. Không có đợt, `blocksHandOver` sai: "Giao đồ · thu …" như cũ.
4. `blocksHandOver` đúng mà không thu được đợt nào: giữ dòng "Còn đợt chưa thu".

Ngoài phạm vi: API, thẻ cọc, sheet thu, `presentUnpaidIfNeeded` / `showUnpaid`.
