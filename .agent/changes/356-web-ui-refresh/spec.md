# Spec — #356

1. `/products/add` renders the same two-column form as edit; a product created with a daily price and a
   cost price stores both (`ProductPricingOption` DAILY row, `costPrice`).
2. Product view shows description, photos, prices, stock per outlet (main) and category/barcode/SKU (side).
3. On `/users/:id`, "Đổi mật khẩu" changes the password of that user, not the signed-in one.
4. In the user list, each row menu item (Sửa, Vô hiệu hóa, Xóa) runs its action.
5. Adding a user as `OUTLET_ADMIN` makes no `GET /merchants/:id` call; a failed create keeps the dialog open.
6. `/customers/:id` shows a title, Sửa and Đơn hàng actions, recent orders and spend excluding `CANCELLED`.
7. Editing a customer and clearing email or address saves the empty value; phone is never sent empty.
8. A merchant without `tenantKey` gets one at login and on `GET /merchants/:id`; settings show the referral
   code, registration link and public product link.
9. `/api/orders?startDate=YYYY-MM-DD` filters by the Vietnam civil day.
10. Settings: section menu is chips below `lg`; read-only values are plain text; plan status, date and toasts are localized.
11. Settings has "In hóa đơn" for `MERCHANT` (every outlet) and `OUTLET_ADMIN` (own outlet): one receipt note per
    outlet, saved with `PUT /api/outlets`; `OUTLET_STAFF` does not see it and `?tab=receipt` sends them to Profile.

Out of scope: #355, accent-insensitive search, currency auto-switch.
