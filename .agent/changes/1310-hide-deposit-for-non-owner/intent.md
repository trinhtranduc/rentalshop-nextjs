# Ẩn dòng "Thu cọc" khỏi mọi vai trò ngoài chủ shop

Issue: #1310 (epic #1309) · Status: in-progress · Created: 2026-10-29

## Vấn đề
`PUT /api/settings/deposit` chỉ cho MERCHANT (`apps/api/app/api/settings/deposit/route.ts:61-63`), nhưng Cài đặt iOS và Android
hiện dòng "Thu cọc" cho mọi vai trò. Quản lý chi nhánh / nhân viên mở được màn rồi bị từ chối khi lưu.

## Kết quả mong muốn
Chủ shop đã chốt (2026-10-29): dòng "Thu cọc" ẩn hẳn với OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY (và ADMIN, không có shop). Chỉ MERCHANT thấy.

## Ràng buộc
- Không đổi API. Không đổi việc thu cọc khi tạo đơn: giỏ vẫn đọc `GET /api/settings/deposit`, `DepositModeStore.refresh` vẫn chạy cho mọi vai trò.
- iOS là chuẩn, Android giống iOS. Không đụng "In & phiếu", QR, ngân hàng, tiền tệ.
