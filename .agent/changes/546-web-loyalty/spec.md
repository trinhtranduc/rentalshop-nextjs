# Spec — #546 Khách thân thiết

Issue: #546 · Status: accepted · Intent: ./intent.md

## States (same as the old page)

1. Loading: header + skeletons.
2. `PLAN_UPGRADE_REQUIRED` from GET program → "Cần gói Professional" tag and the locked card; no save button.
3. Program missing or `isActive: false` → "Chưa kích hoạt" tag, the "Chương trình đang tắt" banner, overview text
   "… Chỉ Super Admin mới có thể bật loyalty và import lịch sử."
4. `isActive: true` → "Đang bật".

## Layout

5. Title "Khách thân thiết" + status tag, subtitle, "Lưu cấu hình" (PUT program). Tab list (Tổng quan, Tích điểm,
   Hạng thành viên, Hết hạn) left from 1024px, a scrolling row above the card below. `?tab=`; an unknown tab → `?tab=overview`.

## Locks (exactly as before; `locks()` in the model)

6. Overview selects (tiêu chí, chu kỳ, hạ hạng): always disabled.
7. Earn switches (đơn thuê, đơn bán): always editable. Their rate / amount: need program active and the switch on.
8. Redeem (giá trị điểm, tối thiểu, tối đa %, dùng điểm ở thuê / bán): need program active.
9. Tiers: checkbox, ngưỡng (never for the default), hệ số, Lưu: need program active and the tier to exist.
10. Expiry: always editable; days for "Theo từng giao dịch", month 1–12 and day 1–28 for "Reset hằng năm".

## Writes

11. PUT program: `programPayload` (no `isActive`, expiry fields only for their mode). Response replaces the program.
12. Tick a preset → POST tier (`presetTierPayload`), "Hãy lưu chương trình trước" when the program has no id.
13. Untick → themed confirm → DELETE tier, then reload. Lưu on a tier → PUT tier (`tierPayload`).
14. Same toasts (now in i18n).

## Out of scope

Turning the program on (Super Admin), customer point history, the shared component in `packages/ui`.
