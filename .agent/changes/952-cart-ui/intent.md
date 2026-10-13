# Intent — #952 cart date icon, edit a customer from the picker, no floating cart bar, no Done bar

Issue: #952 · Owner decision 13/10/26 · Mockup: artifact 9b56KwErJWiGpiyFEfyEY4 tabs "Giỏ hàng" (#cartdate), "Chọn khách: sửa khách" (#custedit)

## What and why
- The cart's customer row has an icon, the date row does not: the two rows do not line up.
- A wrong name or phone seen while picking a customer means leaving the cart to fix it.
- Home shows the cart twice (top-right button with a badge since #941, and a floating bar). The owner keeps only the button.
- The product form's "Xong" keyboard bar (#461) is no longer wanted; tapping outside or dragging closes the keyboard.
- Web (added by the owner the same day): the client order form must make a new line per add, like the apps after #953;
  the admin product form must keep a 0đ price when editing.

## Constraints
iOS is the reference. No API change (existing `PUT /api/customers/{id}`, existing permission rules). Simple and minimal.
