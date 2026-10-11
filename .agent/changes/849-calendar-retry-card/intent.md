# Intent — Lịch shows the retry card when the subscription blocks the shop

Issue: #849 · Found by `scripts/e2e/web-e2e.sh --plan` (WEB-SUB-01..05 merchant-b)

## What
On the shop web, an expired / paused / cancelled / past-due merchant opening Lịch (`/calendar`) sees the
"Không tải được … / Thử lại" card, like Tổng quan, Đơn hàng, Sản phẩm, Khách hàng.

## Why
The calendar routes (`/api/calendar/orders/count`, `/by-date`) do not require an active subscription, so the
page loads the month while every other page shows the retry card. The shop sees data it cannot act on.

## Constraints
- No API change (installed apps read the calendar routes; mobile keeps today's behaviour).
- Keep the #852 branch select working. Reuse the page's existing failure cards (`loadFailed`, `dayFailed`, `retry`).
