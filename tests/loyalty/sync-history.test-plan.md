# Test Plan: POST /api/loyalty/sync-history

## Pre-conditions
- Merchant with Professional plan (features includes "loyalty")
- LoyaltyProgram record exists and isActive=true
- At least 1 tier configured (Thành viên, threshold=0)

## Test Cases

### TC1: Basic sync — empty loyalty, has orders
**Setup**: 3 customers with completed/returned orders, no loyalty data yet
**Action**: POST /api/loyalty/sync-history
**Expected**:
- 3 CustomerLoyalty records created
- Points calculated correctly per RENT/SALE rate
- Tiers assigned based on totalSpent
- Response: { customersProcessed: 3, totalPointsIssued: X }

### TC2: Idempotent — run twice, same result
**Setup**: Run TC1
**Action**: POST /api/loyalty/sync-history (again)
**Expected**:
- Same result as TC1 (no duplicates)
- CustomerLoyalty records upserted (not duplicated)
- Old sync transactions deleted, new ones created
- Real-time transactions (if any) preserved

### TC3: Preserves real-time earn/redeem after first sync
**Setup**:
1. Sync history (creates initial data)
2. Create new order → earn 50 points (real-time transaction created)
3. Redeem 20 points on another order (real-time transaction)
**Action**: POST /api/loyalty/sync-history (re-sync)
**Expected**:
- Real-time earn/redeem transactions NOT deleted (type != 'adjust' OR description != 'Đồng bộ')
- CustomerLoyalty.points recalculated from history (may not include the 50 earn if that order is COMPLETED)
- Actually: the new order IS included in the SQL query (it's COMPLETED) → points should include it
- The 20 redeemed points: LoyaltyTransaction type='redeem' preserved but balance recalculated

### TC4: No orders — no customers processed
**Setup**: Merchant with 0 orders
**Action**: POST /api/loyalty/sync-history
**Expected**:
- Response: { customersProcessed: 0, totalPointsIssued: 0 }
- No crash

### TC5: Orders without customer — skipped
**Setup**: Orders with customerId=null (walk-in)
**Expected**: Not included in aggregation (WHERE customerId IS NOT NULL)

### TC6: Cancelled orders — excluded
**Setup**: Mix of COMPLETED, RETURNED, CANCELLED orders
**Expected**: Only COMPLETED + RETURNED counted

### TC7: Soft-deleted orders — excluded
**Setup**: Orders with deletedAt != null
**Expected**: Excluded (WHERE deletedAt IS NULL)

### TC8: Tier assignment — correct tier selected
**Setup**:
- Tiers: Thành viên (0), Bạc (500k), Vàng (2M)
- Customer A: totalSpent = 1.5M → Bạc
- Customer B: totalSpent = 3M → Vàng
- Customer C: totalSpent = 100k → Thành viên
**Expected**: Correct tier assigned to each

### TC9: RENT vs SALE earn rates different
**Setup**:
- rentEarnPerAmount=10000, rentEarnRate=1
- saleEarnPerAmount=20000, saleEarnRate=1
- Customer: 100k RENT + 100k SALE
**Expected**: RENT points = 10, SALE points = 5, Total = 15

### TC10: Earn disabled for one type
**Setup**: rentEarnEnabled=false, saleEarnEnabled=true
- Customer: 100k RENT + 100k SALE
**Expected**: Only SALE earns points (5). RENT = 0.

### TC11: Permission denied — non-merchant user
**Action**: OUTLET_STAFF calls POST /api/loyalty/sync-history
**Expected**: 403 Forbidden

### TC12: Program not active
**Setup**: LoyaltyProgram.isActive=false
**Action**: POST /api/loyalty/sync-history
**Expected**: 400 "Chương trình loyalty chưa được kích hoạt"

### TC13: No program exists
**Setup**: No LoyaltyProgram for merchant
**Action**: POST /api/loyalty/sync-history
**Expected**: 400 "Chưa tạo chương trình loyalty"

### TC14: Large dataset performance
**Setup**: 1000 customers, 5000 orders
**Expected**: Completes within 30 seconds, no timeout

### TC15: tierMetric = total_orders
**Setup**: tierMetric='total_orders', Tiers: member(0), silver(5), gold(20)
- Customer A: 15 orders → silver
- Customer B: 25 orders → gold
**Expected**: Tier assigned by order count, not spend amount
