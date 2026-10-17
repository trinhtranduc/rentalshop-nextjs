# Spec — Order lists keep colour only on the status badge

Issue: #1026 · Status: in-progress · Intent: ./intent.md

## Behaviour

1. Date chip (pickup / return): no fill, no left padding, icon tint #64748B, text #0F172A.
   Sorted date bold (Tất cả đơn), other regular — unchanged.
2. Sale rows (not cancelled): the text "Bán dd/mm/yy" becomes a date chip of kind sale with the ↗ icon
   (iOS `arrow.up.forward`, Android `Icons.Outlined.ArrowOutward`), same neutral style. Spoken "Bán dd/mm/yy".
3. Việc cần làm and calendar day rows use the same neutral date chip; "Trễ N ngày", "Chưa soạn đồ",
   "Sẵn sàng giao" keep their colours.
4. Product calendar day orders: "Lấy T2 05/10 · trả T4 07/10" becomes "↗ T2 05/10  ↩ T4 07/10";
   the spoken text keeps the words.
5. Status badges, work tags, late pill, "còn thu", refund line: unchanged.

## Out of scope

API, order detail, sorting, filters. The product detail "Lấy hôm nay" right-hand text is no longer drawn
on either app (since #891 the product order row is the shared order row; `rowState` has no UI caller), so
there is no UI change there.

## API compatibility

No API change. No `.agent/api-changes/LOG.md` row.
