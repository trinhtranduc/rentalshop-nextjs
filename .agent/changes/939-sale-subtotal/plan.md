# Plan — #939

1. Failing tests (commit 1):
   - Android `OrderDetailLogicTest.saleSubtotalIsTheItemSum`, `OrderShareModelTest.saleSubtotalIsTheItemSumNotTheTotal`
     (total 396, items 792); `saleTotals` expects the item sum.
   - iOS `OrderDetailLogicTests.testSaleSubtotalIsTheItemSum`, `OrderShareImageTests.testSaleSubtotalIsTheItemSumNotTheTotal`.
2. Fix (commit 2): `OrderDetailLogic.saleSubtotal` on both apps; Android detail + share use it; iOS detail + share use it.
3. Verify: `:app:assembleDebug :app:testDebugUnitTest`, iOS build + unit tests, screenshots on both apps with a
   sale order whose `totalAmount` differs from its item sum (own DB `anyrent_939`).
