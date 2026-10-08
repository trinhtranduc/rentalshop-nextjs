# Spec — #670
1. Web card rows carry the actor of the matching change entry (created/pickedUp/returned/cancelled: latest of kind; payment: same amount+direction within 10 min). No match → no "bởi".
2. "(nhân viên)" for OUTLET_STAFF and OUTLET_ADMIN (existing mobile rule).
3. OUTLET_STAFF: 403 FORBIDDEN on orders/products `changes` and `history`, no audit read.
4. Web: no card and no `/changes` call for OUTLET_STAFF. iOS/Android: no history entry on order and product detail, no count call.
