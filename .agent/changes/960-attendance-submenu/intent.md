# #960 Intent

Status: in progress

Owner, 13/10/26: the pill tab bar on top of every Chấm công page is hard to read and to switch. Move the five
screens (Bảng công, Chi tiết theo người, Xếp ca, Mẫu ca, Mã QR & vị trí) into a sub-menu under "Chấm công" in
the left sidebar, as in the mockup (artifact MikH31P6eVqyzbnj6BoWzf, tab Web).

Owner follow-up (same PR): the top bar always shows a wide search field. Replace it with a breadcrumb for the
current page ("Chấm công › Chi tiết theo người", "Đơn hàng › #652066") and a compact search icon that opens the
same search ("/" still works).

Constraints: `apps/client` only, no API change, same visibility rules (module on; MERCHANT / OUTLET_ADMIN; staff
never), works in the narrow-screen drawer, strings in 5 locales. Keep it simple: reuse the shell nav model.
