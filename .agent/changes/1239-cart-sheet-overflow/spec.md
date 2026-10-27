# Spec

- `items` của sheet xác nhận = chuỗi của món đầu (`Tên ×SL` nếu SL > 1), thêm `moreCount` = số món còn lại.
- `moreCount > 0`: dòng "Món" hiện món đầu, xuống dòng hiện "+N sản phẩm khác" (en: "+N more item(s)").
- Giỏ 1 món: như cũ, không có dòng thêm.
- Chuỗi mới: `products.cart.confirm.more` / `.one` (iOS), plurals `v2_cart_confirm_more` (Android), en + vi.
- API compat: không đổi. Không đổi mã lỗi, không đổi locales web.
