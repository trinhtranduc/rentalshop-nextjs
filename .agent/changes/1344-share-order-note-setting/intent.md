# Hiện ghi chú đơn trên ảnh chia sẻ: cấu hình theo shop (API + web)

Issue: #1344 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-30

## Problem

Ảnh chia sẻ đơn (iOS + Android) không bao giờ có ghi chú chung của đơn (#930), vì ghi chú đơn có thể là ghi chú nội bộ.
Chủ shop muốn tự chọn cho shop mình. Chưa có chỗ cấu hình, app không biết shop muốn gì.

## Proposed outcome

- Một công tắc theo SHOP "Hiện ghi chú đơn trên ảnh chia sẻ" (phương án C đã chốt, mockup bản 214, tab "★ Ảnh chia sẻ đơn: thứ tự tiền").
- Chỉ MERCHANT bật / tắt; mặc định TẮT; lưu ngay khi gạt.
- API lưu trong `Merchant.settings.shareOrderNote`, đọc ở `GET /api/users/profile` `merchant.shareOrderNote`.
- Web: thẻ "Hoá đơn" của tab "In & phiếu" có công tắc; vai trò khác thấy ô mờ "Chỉ chủ shop bật/tắt.".
- Phần vẽ ảnh và công tắc điện thoại (gói Basic chỉ có điện thoại) do hai agent mobile làm sau PR này, theo hợp đồng API.

## Affected users and systems

MERCHANT (đổi), mọi vai trò (đọc). api, client, `packages/utils`. Không schema, không migration.

## Constraints

- Chỉ thêm trường; app đã cài trên `main-real` bỏ qua khoá lạ (rà trong issue).
- Giữ các khoá khác của `Merchant.settings` (`payment`, `blockPricing`...).
- Chủ shop: đơn giản; không thêm UI thừa.

## Open questions

- Theo shop hay theo chi nhánh: chủ shop đã chốt theo shop.

## Decision log

- 2026-10-30 — owner: phương án C, công tắc ở "In & phiếu", chỉ chủ shop, mặc định tắt.
- 2026-10-30 — khoá phẳng `settings.shareOrderNote` (không `shareImage.showOrderNote` như bản nháp mô tả) theo hợp đồng caller giao cho hai agent mobile.
- 2026-10-30 — ADMIN hệ thống cũng 403 (như `blockPricing`; ADMIN không có shop).
- 2026-10-30 — không thêm vào phản hồi đăng nhập: app đọc lại qua profile (foreground, khi chia sẻ) nên login không giúp được gì (agent).
