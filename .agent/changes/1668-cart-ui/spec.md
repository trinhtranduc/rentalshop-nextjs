# Spec (#1668)

1. `CartTabs` nhận `trailing?: ReactNode`, ghim ở cuối bên phải của hàng giỏ hàng (`sticky right-0 ml-auto`).
2. Tạo đơn: `OrderEditor` truyền tab Cho thuê / Bán (`typeSwitch(true)`, gọn, rộng 220px) vào `CartTabs`; cột giỏ không còn tab này. Sửa đơn (không có hàng giỏ hàng): tab ở đầu cột giỏ (`typeSwitch(false)`), vẫn khoá loại đơn kia và khoá khi đang gửi.
3. Cột giỏ giữ nguyên cách cuộn cũ (một vùng cuộn, `max-h` theo màn hình); không khối nào co lại.
4. Mỗi `CartLineRow` là thẻ `rounded-xl border border-ar-line bg-ar-subtle p-3`; danh sách món `gap-2.5`.
5. Vùng thanh toán `data-testid="cart-payment"` là thẻ `rounded-xl bg-ar-subtle p-4` trong dòng cuộn, nhãn `editor.cart.payment` (12 ngôn ngữ), "Tổng đơn" cỡ `text-2xl`.
6. Nút "Tạo đơn" / "Lưu thay đổi": `h-[52px] flex-none shrink-0`.

Test: `tests/web-cart-layout.test.ts` (cấu trúc, 22 test) cùng các test cũ `web-cart-tabs-wiring`, `web-create-order-*`, `hardcoded-vietnamese`. Kiểm tra thật trên Chrome: giỏ 1 và 7 món, màn sửa đơn, màn hẹp.
