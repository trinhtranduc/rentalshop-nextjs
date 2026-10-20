# Intent — #1137 Đơn online title and reject-reason sheet

Owner feedback on #1124 mobile screens:
- The list opened from the Orders chip should be titled "Đơn online" (chip and detail too, for one word).
- "Từ chối" should open a sheet with a title and a description, not a bare action sheet / dialog.

Why: shop staff read "Đơn online" as orders that came in online; a reason picker without context does not say the customer sees it.
Constraints: iOS is the reference, Android matches. No API change. Simple, existing styling. en + vi (the locales both apps ship).
