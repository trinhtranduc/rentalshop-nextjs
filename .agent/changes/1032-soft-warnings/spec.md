# Spec — Late and not-prepared warnings without a coloured box

Issue: #1032 · Status: in-progress · Intent: ./intent.md

## Behaviour

1. A row warning has no fill and no left padding; text 12pt/sp (`DS.TextSize.pill`), medium weight.
2. Late ("Trễ N ngày", and "Quá N ngày" on Chưa lấy đồ): text and icon #B91C1C; icon iOS `clock`,
   Android `Icons.Outlined.Schedule`, before the text.
3. Not prepared ("Chưa soạn đồ"): text and icon #9A3412; icon iOS `shippingbox`,
   Android `Icons.Outlined.Inventory2`, before the text.
4. Applies to: Việc cần làm rows, order list / search rows, Chưa lấy đồ, Lịch day rows, Tổng quan › đang
   thuê, product and customer order rows (all share the order row components).
5. Spoken text unchanged (the icon is not read).
6. Unchanged: status badge (solid), task tags, date chips, "Sẵn sàng giao", "còn thu", the Lịch refund / due note,
   the Lịch header "N trễ", order detail, and the `DS.Status.late` / `.waiting` tokens (other screens use them).
7. Lịch day rows (owner, mockup "Lịch › đơn trễ: icon"): the late note under the total is the same late warning
   (clock + "Trễ N ngày", red, not bold, no box); a fee follows on the same line as " · phí N" in grey #64748B
   regular. "Chưa soạn đồ" on Lịch rows is the soft warning too. Spoken "Trễ N ngày · phí N" unchanged.

## Out of scope

API, when a warning shows, order detail, section bands.

## API compatibility

No API change. No `.agent/api-changes/LOG.md` row.
