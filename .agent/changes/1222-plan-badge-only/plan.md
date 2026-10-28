# Plan

1. Test đỏ: API list (có/không capability), web model, iOS, Android.
2. API: select `depositPlan` khi có capability, một groupBy cho đơn có kế hoạch, gắn field, bỏ `depositPlan` thô.
3. Web: `paidBadgePercent` theo `hasDepositPlan`; bỏ phụ thuộc chế độ shop.
4. iOS rồi Android: bỏ suy từ depositAmount, bỏ `DepositModeStore.refresh` ở danh sách nếu không còn dùng.
5. LOG `.agent/api-changes/LOG.md`, kiểm Jest hai TZ, test mobile, xem bằng mắt.
