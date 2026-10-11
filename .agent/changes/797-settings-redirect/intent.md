# #797 — mục Settings của menu admin

Bấm Settings trong menu phải mở một trang, không phải 404. Chỉ thêm `apps/admin/app/settings/page.tsx` chuyển tới `/settings/billing` (trang settings duy nhất). Không đổi API.
