# Product Stock Management Implementation Summary

## ✅ Implementation Complete

All planned features for product stock management have been successfully implemented according to Odoo best practices.

## What Was Implemented

### 1. Helper Functions (`packages/database/src/product.ts`)

#### `syncOutletStockAvailable(productId, outletId)`
- Recalculates `available = stock - renting` to ensure data consistency
- Can be called manually or automatically after stock/renting updates

#### `updateOutletStockForOrder(orderId, oldStatus, newStatus, orderType, outletId, orderItems)`
- Handles stock/renting updates when order status changes
- Implements Odoo best practices:
  - **SALE orders**: Permanently decrease `stock` when COMPLETED/PICKUPED
  - **RENT orders**: Use `renting` field (temporary), `stock` doesn't change

### 2. Order Update Integration (`packages/database/src/order.ts`)

- Modified `updateOrder()` to automatically call `updateOutletStockForOrder()` when order status changes
- Gets old status before update to calculate correct transitions
- Handles errors gracefully (logs but doesn't fail order update)

### 3. Availability Check APIs

#### `/api/products/[id]/availability`
- Fixed to calculate `available = stock - renting` from OutletStock
- Only checks RENT orders for conflicts (SALE orders don't affect rental availability)
- Calculates conflicts from actual orders with date overlap

#### `/api/products/availability`
- Fixed to separate RENT vs SALE logic
- RENT: Calculates `renting` from PICKUPED orders
- SALE: COMPLETED/PICKUPED orders already reduced stock (no need to recalculate)

### 4. Sync Script (`scripts/sync-outlet-stock-available.js`)

- Recalculates `renting` from actual RENT orders (PICKUPED status)
- Recalculates `available = stock - renting` for all OutletStock entries
- Verifies SALE orders stock reduction
- Fixes any inconsistencies in existing data

## Logic Implementation Details

### SALE Orders (Permanent Stock Reduction)

| Status Transition | Stock Change | Available Change | Renting Change |
|-------------------|--------------|------------------|----------------|
| → RESERVED | No change | No change | No change |
| → COMPLETED/PICKUPED | Decrease | Decrease | No change |
| COMPLETED → CANCELLED | Increase (rollback) | Increase (rollback) | No change |

**Key Points**:
- SALE orders permanently reduce inventory (sold, not returned)
- Stock reduction happens when order is COMPLETED or PICKUPED
- Cancellation rolls back stock if order was already completed

### RENT Orders (Temporary Rental)

| Status Transition | Stock Change | Available Change | Renting Change |
|-------------------|--------------|------------------|----------------|
| → RESERVED | No change | Decrease | No change |
| RESERVED → PICKUPED | No change | No change* | Increase |
| PICKUPED → RETURNED | No change | Increase | Decrease |
| PICKUPED → CANCELLED | No change | Increase (rollback) | Decrease (rollback) |
| RESERVED → CANCELLED | No change | Increase (rollback) | No change |

*Available already decreased in RESERVED status

**Key Points**:
- RENT orders use `renting` field (temporary, items are returned)
- Stock remains unchanged (items are not sold)
- Available = stock - renting (always)

## Files Modified

1. **`packages/database/src/product.ts`**
   - Added `syncOutletStockAvailable()` function
   - Added `updateOutletStockForOrder()` function
   - Fixed logic to ensure `available = stock - renting` consistency

2. **`packages/database/src/order.ts`**
   - Modified `updateOrder()` to call stock update function
   - Gets old status before update for correct transition calculation

3. **`apps/api/app/api/products/[id]/availability/route.ts`**
   - Fixed availability calculation to use `stock - renting`
   - Only checks RENT orders for conflicts

4. **`apps/api/app/api/products/availability/route.ts`**
   - Fixed to separate RENT vs SALE logic
   - SALE orders don't count as "rented" (they reduce stock permanently)

5. **`scripts/sync-outlet-stock-available.js`** (NEW)
   - Script to sync existing data
   - Recalculates renting and available from actual orders

## Testing

### Test Files Created

1. **`tests/product-stock-management.test.js`**
   - Test cases for SALE order stock management
   - Test cases for RENT order renting management
   - Test cases for status transitions

2. **`docs/STOCK_MANAGEMENT_TESTING.md`**
   - Comprehensive testing guide
   - Manual testing steps
   - Verification checklist
   - Common issues and solutions

## Next Steps

### 1. Run Sync Script (Recommended First)

Before testing, sync existing data:
```bash
node scripts/sync-outlet-stock-available.js
```

This will:
- Fix any inconsistencies in existing OutletStock data
- Recalculate renting from actual orders
- Recalculate available = stock - renting

### 2. Manual Testing

1. Create a SALE order and update status to COMPLETED
   - Verify stock decreases
2. Cancel the SALE order
   - Verify stock rolls back
3. Create a RENT order and update status through RESERVED → PICKUPED → RETURNED
   - Verify renting and available update correctly
4. Test availability check API with rental dates
   - Verify conflicts are calculated correctly

### 3. Automated Testing

Run test file (requires Jest or similar):
```bash
yarn test tests/product-stock-management.test.js
```

## Verification Queries

### Check OutletStock Consistency
```sql
SELECT 
  os.id,
  p.name as product_name,
  os.stock,
  os.renting,
  os.available,
  (os.stock - os.renting) as calculated_available
FROM "OutletStock" os
JOIN "Product" p ON p.id = os."productId"
WHERE os.available != (os.stock - os.renting);
```

### Check Actual Renting from Orders
```sql
SELECT 
  os."productId",
  os."outletId",
  os.renting as stock_renting,
  COALESCE(SUM(oi.quantity), 0) as actual_renting
FROM "OutletStock" os
LEFT JOIN "OrderItem" oi ON oi."productId" = os."productId"
LEFT JOIN "Order" ord ON ord.id = oi."orderId" 
  AND ord."outletId" = os."outletId"
  AND ord."orderType" = 'RENT'
  AND ord.status = ORDER_STATUS.PICKUPED
GROUP BY os.id, os."productId", os."outletId", os.renting
HAVING os.renting != COALESCE(SUM(oi.quantity), 0);
```

## Key Improvements

1. ✅ **SALE orders now properly reduce stock** (was missing before)
2. ✅ **RENT orders use renting field correctly** (temporary, not permanent)
3. ✅ **Available always equals stock - renting** (ensured consistency)
4. ✅ **Availability check APIs fixed** (separate RENT vs SALE logic)
5. ✅ **Automatic stock updates** (when order status changes)
6. ✅ **Sync script for existing data** (fixes inconsistencies)

## Notes

- All changes follow Odoo best practices for rental shop management
- Stock changes are permanent for SALE orders (sold, not returned)
- Renting changes are temporary for RENT orders (items are returned)
- Available is always calculated as `stock - renting` for consistency
- Errors in stock updates are logged but don't fail order updates (graceful degradation)

