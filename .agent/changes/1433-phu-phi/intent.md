# Đổi nhãn "Phí hư hỏng" thành "Phụ phí"

Issue: #1433 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-11-01

## Problem

Khoản phí ở bước nhận trả hiện mang tên "Phí hư hỏng" (có nơi "Phí hư hại"). Chủ sản phẩm muốn gọi là "Phụ phí".

## Proposed outcome

Trên iOS, Android, web, biên lai và ảnh chia sẻ, người dùng thấy "Phụ phí". Tiếng Anh thấy "Extra fee". Không đổi gì ở API và cơ sở dữ liệu.

## Affected users and systems

Mọi vai trò xem đơn và báo cáo. iOS, Android, `apps/client`. `apps/admin` dùng chung `locales`.

## Constraints

- App đã cài so khớp câu API "Thu phí hư hỏng" (`OverviewDashLogic.swift:448`, `OverviewRelated.kt:115` trên `origin/main-real`). Câu này phải giữ nguyên.
- Giữ tên key, trường `damageFee`, `damageNotes`, cơ sở dữ liệu.
- Trang marketing giữ nguyên, chủ sản phẩm quyết định sau.

## Open questions

- Cột Excel "Tiền đền bù" (`apps/api/app/api/orders/export/route.ts:232`) có đổi thành "Phụ phí" không? Đây là thay đổi API nên chưa làm.
- Câu trên hai trang marketing có đổi không?

## Decision log

- 2026-11-01 — "phí hư hỏng -> phụ phí" (chủ sản phẩm).
- 2026-11-01 — Không đổi câu API; app mới hiển thị chữ mới qua key có sẵn (agent, sau khi đọc code app cũ).
- 2026-11-01 — "Ghi chú hư hỏng" và mục ghi chú "Hư hỏng" giữ nguyên vì là ghi chú về tình trạng đồ, không phải khoản phí (agent).
