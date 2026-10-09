# Spec — #684

1. Cart line tag (rent, line short on some days): "Hết hàng ngày 03/10" (one day) or "Hết hàng từ 03/10 → 05/10" (first → last short day). No order numbers.
2. The tag is a button (≥44pt touch target, accessibility "Xem đơn trùng ngày …"). Tap → Lịch trống of that product, month and focus on the first clashing day; its list shows the orders holding the product that day.
3. The orange "Trùng lịch" block in the confirm sheet is unchanged.
4. Thêm người dùng: role field shows "Chọn vai trò" (muted) until a role is picked. Edit user shows the user's role.
5. Tapping the role field opens a sheet: one row per allowed role (`UserFormRoles.choices`), title + one line:
   - Quản lý chi nhánh — Một chi nhánh: đơn, sản phẩm, giá, khách, tiền trong ngày, nhân viên của chi nhánh.
   - Nhân viên — Tạo đơn, giao đồ, nhận trả, thêm khách. Không sửa giá sản phẩm, không xem báo cáo tiền.
   - Nhân viên kho — Như nhân viên, thêm quản lý sản phẩm và danh mục (thêm, sửa giá, xoá). Không xem báo cáo tiền.
   The current choice is checked; picking a row closes the sheet and fills the field.
6. Save with no role → inline error "Chọn vai trò"; nothing is sent.
7. Strings vi + en on both apps; unit tests for the tag text and the empty-role rule.
8. Cart line layout (canvas "AnyRent Cart Items", owner 2026-10-09: the card option's content, without the card):
   flat rows with a divider; 64pt photo; line 1 the name; line 2 a blue link "Theo ngày · 400.000/ngày × 2 ngày ⌄"
   (15pt; "· Nhập giá" when no price) that opens Cách tính giá; the "Hết hàng …" tag under it when there is one;
   last row the line total (bold, left, under the text) and the −/+ stepper (right). No separate "450.000/lần × 1"
   line. Sale lines keep "Còn N" under the link.
