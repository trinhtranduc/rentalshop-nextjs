# Intent — #670 order history: who did each step; staff cannot see history

Status: accepted (owner 2026-10-08: "chốt"; then "chỉ có admin merchant và admin outlet mới xem được lịch sử, nhân viên không xem được lịch sử")

## Problem
Owners need to see who created an order, handed items out, took the return, collected money or cancelled.
Web showed the creator only; mobile showed the actor in a small footer. Outlet staff could read every change history.

## Outcome
- Web "Lịch sử" card: avatar + "bởi <tên> (nhân viên) · giờ" per row, from `GET /api/orders/{id}/changes`.
- iOS/Android "Lịch sử thay đổi": footer "bởi **tên** · HH:mm"; unknown actor → time only.
- Change history (orders and products) only for ADMIN, OPS, MERCHANT, OUTLET_ADMIN: API 403 for OUTLET_STAFF; UIs hide the entry/card and skip the call.

## Constraints
Installed apps: staff get an error message instead of the list (no sign-out, no crash); see LOG row.
