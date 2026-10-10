# Spec — #751

1. A page that lands is appended without the ids already in the list (`NotificationsLogic.appendPage`, iOS and Android; Android v1 and v2 screens, iOS controller). Order is kept.
2. Android v2: a long press on a row opens a confirm ("Xoá thông báo này?"); the row is deleted only on "Xoá".
3. Not in this change: mark one notification unread on Android (iOS has it in the swipe actions).
