# Spec — #937

1. Home (v2, `newProducts`): the bell is replaced by a cart button (cart icon). Badge = item count of the cart
   (sum of quantities, same number as the cart bar), capped at 99, hidden when the cart is empty. Tap → cart (same
   screen the cart bar opens). The floating cart bar stays.
2. Settings (v2, `newSettings`): row "Thông báo" / "Notifications" first in CỬA HÀNG for every role, badge with the
   unread count (red, capped 99, hidden at 0), opens the existing inbox. The count follows the existing unread
   source (iOS `.inboxUnreadCountDidChange` + `NotificationService.getUnreadCount`, Android `InboxUnread`).
   Push delivery and opening from a push are unchanged.
3. Home product row: name `numberOfLines`/`maxLines` 2 with ellipsis. Only the Home row.

Out of scope: old Home / old Settings (flags off keep today's screens; old Settings already has a Notifications row).
