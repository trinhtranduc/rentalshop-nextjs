# Spec — #952

1. **Cart date row (rent only).** A 40pt light-blue circle with a calendar icon, same size and leading margin as the
   customer row avatar. No dates: "Chọn ngày thuê" in primary blue. Dates: "dd/mm/yy → dd/mm/yy" on one line and the
   "N ngày" pill on the right. Sale cart: no date row (unchanged).
2. **Customer picker pencil.** Each customer row in the cart's picker has a small pencil button on the right.
   Row tap = pick (unchanged). Pencil = sheet "Sửa khách hàng" with name, phone, address, note; the other fields
   (email, ID, date of birth) are loaded and sent back unchanged. Save → `PUT /api/customers/{id}` (existing),
   the list reloads, toast "Đã lưu khách hàng"; if that customer is the cart's customer, the cart shows the new
   name / phone / address. The pencil shows only when the user may edit customers (iOS `canManageCustomers()`,
   Android `role != UNKNOWN`, the rules the customer detail already uses).
3. **Home.** No floating cart bar. The top-right cart button with its count badge is the only entry to the cart.
4. **iOS product form.** No "Xong" bar on the number fields. The keyboard closes by a tap outside a field or by
   dragging the form (already wired: tap recognizer + `keyboardDismissMode = .interactive`). Android has no such bar.
5. **Web client order form.** Every add of a product makes a new line keyed by its own id; quantity, price (0đ allowed),
   note and remove act on that line; availability hints sum a product's lines; editing an order keeps its lines.
6. **Admin product form.** Editing a 0đ product keeps 0đ: empty box = no price, "0" = 0đ (client rule from #953).

API: no change.
