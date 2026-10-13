# Intent — #939 same "Tạm tính" on sale orders in both apps

**What:** on a SALE order, the "Tạm tính" / "Tiền hàng" line of the order detail and of the share image is the
sum of the item lines on iOS and Android. "Tổng cộng" stays the server `totalAmount`.

**Why:** test data from #930 showed iOS 396 and Android 792 for the same order. The owner (13/10/26) wants one number.

**Constraints:** iOS is the reference (already item sum). No API change. Unit tests on both apps.
Web order detail (`order-money.ts`), web receipts (`receipt-totals.ts`, `apps/client/app/orders/receipt/receipt-model.ts`)
and both thermal printers already use the item sum; nothing to change there.
