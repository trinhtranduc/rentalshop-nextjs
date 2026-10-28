# Spec

- Tiêu đề thẻ cọc, tên giai đoạn, dòng phụ của giai đoạn, chip giai đoạn ở Việc cần làm, tên mẫu ở giỏ hàng, nút "Giao đồ · thu N", tiêu đề nhóm Việc cần làm: xuống dòng, không "…".
- Huy hiệu (pill) không bao giờ bị nén.
- Ô nhập tên mẫu: iOS thu nhỏ chữ vừa ô, Android cho tối đa 3 dòng.
- Chuỗi `deposit.card.restDetail`, `deposit.cart.restDetail` (iOS) và `deposit_card_rest_detail`, `deposit_cart_rest_detail` (Android): "Thu khi giao · %@" / "At hand-over · %@" (tránh lặp lại tiêu đề "Phần còn lại, thu khi giao").
- Web: `truncate` thành `break-words` ở hàng giai đoạn, nhắc thu, tóm tắt mẫu, hàng Việc cần làm kiểu giai đoạn; huy hiệu "Đã thu N%" không xuống dòng giữa chữ.
- Không đổi API, schema, key i18n.
