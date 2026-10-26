# Spec (#1229)

| Nơi | Cũ | Mới (vi / en) |
|---|---|---|
| Web `installments.createAndCollect` | Tạo đơn và thu giai đoạn 1 · {amount} | Tạo đơn · thu {amount} / Create · collect {amount} |
| Web `installments.stagePlan.collectLater` | Chưa thu, tạo đơn trước | Tạo đơn, thu sau / Create, collect later |
| iOS `deposit.cart.createAndCollect`, Android `deposit_cart_create_and_collect` | Tạo đơn và thu giai đoạn 1 | Tạo đơn · thu cọc / Create · collect |

Mobile không có số tiền trong nút: thanh bên trái đã ghi "Thu ngay · giai đoạn 1" và số tiền.
Android: bỏ trọng số rộng 1.7 của nút; ở máy 360dp nhãn 18sp vẫn xuống dòng và bị cắt, nên nút giai đoạn dùng 16sp, một dòng, lề 8dp (`AppPrimaryButton` thêm `fontSize`, `singleLine`, mặc định giữ nguyên).
Không đụng API, không cần dòng LOG.
