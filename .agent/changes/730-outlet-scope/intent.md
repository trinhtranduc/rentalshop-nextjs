# Intent: outlet roles stay inside their own outlet (#730 #731 #732)

Staff, Nhân viên kho and Outlet admin work on one outlet. The API must refuse what reaches another outlet of
the same merchant: editing or moving its orders (#730), reading its orders (#731), reading its stock and
bookings through the availability family (#732). Today the list is scoped, these routes are not.

Constraint: installed mobile apps cannot be force-updated. They send their own outlet; only calls a role never
legitimately made may start to fail. No response shape changes.
