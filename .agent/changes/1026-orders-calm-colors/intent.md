# Order lists keep colour only on the status badge

Issue: #1026 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-17

## Problem

Customers say the order lists have too many colours: blue "Lấy" chips, purple "Trả" chips, next to the
coloured status badge, the late pill and the pay line. The eye cannot find the status.

## Proposed outcome

On every mobile screen with order rows (Orders tab lists, search, calendar day, product orders, product
calendar, overview drill-downs, customer orders) only the order status badge keeps a coloured fill.
Pickup / return / sale dates show a grey icon (↗ pickup and sale, ↩ return), dark text (#0F172A),
no background. The sorted date stays bold. VoiceOver / TalkBack still read "Lấy 14/10/26", "Trả …", "Bán …".
Kept in colour: status badges (#888), "Trễ N ngày", "Chưa soạn đồ", "còn thu".

## Affected users and systems

All roles using the iOS and Android apps. No API, no data model.

## Constraints

No API change. No change to order detail, sorting or filters. iOS is the reference; Android matches.

## Open questions

- "Sẵn sàng giao" (calendar, green) is neither in the keep list nor a date chip; left unchanged (#893 test). Owner to confirm.
- A cancelled sale keeps "Huỷ dd/mm/yy" (no "Bán" word there); unchanged.

## Decision log

- 2026-10-17 — mockup "Mọi màn đơn hàng: bớt màu" approved, ship in this release (owner)
