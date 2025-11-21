# Product Stock Management Testing Guide

## Overview

This document describes how to test the product stock management logic that was implemented to handle SALE and RENT orders according to Odoo best practices.

## Test Scenarios

### 1. SALE Order Stock Management

#### Test 1.1: Stock Decrease on COMPLETED
**Scenario**: SALE order status changes from RESERVED → COMPLETED

**Expected Behavior**:
- `stock` decreases by order quantity (permanent reduction)
- `available` decreases by order quantity
- `renting` remains unchanged (SALE doesn't use renting)

**Steps**:
1. Create a product with `stock = 10`, `available = 10`, `renting = 0`
2. Create a SALE order with `quantity = 2`, status = `RESERVED`
3. Update order status to `COMPLETED`
4. Verify: `stock = 8`, `available = 8`, `renting = 0`

#### Test 1.2: Stock Rollback on CANCELLED
**Scenario**: SALE order status changes from COMPLETED → CANCELLED

**Expected Behavior**:
- `stock` increases by order quantity (rollback)
- `available` increases by order quantity
- `renting` remains unchanged

**Steps**:
1. Create a SALE order with `quantity = 3`, status = `COMPLETED`
2. Set `stock = 7`, `available = 7` (reflecting completed order)
3. Update order status to `CANCELLED`
4. Verify: `stock = 10`, `available = 10`, `renting = 0`

#### Test 1.3: RESERVED Status (No Stock Change)
**Scenario**: SALE order status = `RESERVED`

**Expected Behavior**:
- `stock` remains unchanged (not sold yet, just reserved)
- `available` remains unchanged
- `renting` remains unchanged

**Steps**:
1. Create a SALE order with `quantity = 2`, status = `RESERVED`
2. Verify: `stock = 10`, `available = 10`, `renting = 0` (no changes)

### 2. RENT Order Renting Management

#### Test 2.1: RESERVED → PICKUPED Transition
**Scenario**: RENT order status changes from RESERVED → PICKUPED

**Expected Behavior**:
- `stock` remains unchanged (rental is temporary)
- `renting` increases by order quantity
- `available` decreases by order quantity (if not already decreased in RESERVED)

**Steps**:
1. Create a RENT order with `quantity = 2`, status = `RESERVED`
2. Update status to `RESERVED` (first time): `available = 8`, `renting = 0`
3. Update status to `PICKUPED`: `renting = 2`, `available = 8` (already decreased)
4. Verify: `stock = 10`, `renting = 2`, `available = 8`

#### Test 2.2: PICKUPED → RETURNED Transition
**Scenario**: RENT order status changes from PICKUPED → RETURNED

**Expected Behavior**:
- `stock` remains unchanged
- `renting` decreases by order quantity
- `available` increases by order quantity

**Steps**:
1. Create a RENT order with `quantity = 2`, status = `PICKUPED`
2. Set `stock = 10`, `available = 8`, `renting = 2`
3. Update status to `RETURNED`
4. Verify: `stock = 10`, `renting = 0`, `available = 10`

#### Test 2.3: CANCELLED After PICKUPED
**Scenario**: RENT order status changes from PICKUPED → CANCELLED

**Expected Behavior**:
- `stock` remains unchanged
- `renting` decreases by order quantity (rollback)
- `available` increases by order quantity (rollback)

**Steps**:
1. Create a RENT order with `quantity = 2`, status = `PICKUPED`
2. Set `stock = 10`, `available = 8`, `renting = 2`
3. Update status to `CANCELLED`
4. Verify: `stock = 10`, `renting = 0`, `available = 10`

#### Test 2.4: CANCELLED After RESERVED
**Scenario**: RENT order status changes from RESERVED → CANCELLED

**Expected Behavior**:
- `stock` remains unchanged
- `renting` remains unchanged (wasn't picked up)
- `available` increases by order quantity (rollback reservation)

**Steps**:
1. Create a RENT order with `quantity = 2`, status = `RESERVED`
2. Set `available = 8` (reserved)
3. Update status to `CANCELLED`
4. Verify: `stock = 10`, `renting = 0`, `available = 10`

### 3. Availability Check with Rental Dates

#### Test 3.1: Single Product Availability Check
**Scenario**: Check availability for a specific product and rental period

**Expected Behavior**:
- Returns `available = stock - renting` from OutletStock
- Calculates conflicts from active RENT orders with date overlap
- Returns `effectivelyAvailable = available - conflictingQuantity`

**Steps**:
1. Create product with `stock = 10`, `renting = 2`, `available = 8`
2. Create RENT order with status = `PICKUPED`, dates: `2024-01-15` to `2024-01-20`
3. Check availability for dates: `2024-01-18` to `2024-01-22`
4. Verify: `conflictingQuantity = 2`, `effectivelyAvailable = 6`

#### Test 3.2: Multi-Outlet Availability Check
**Scenario**: Check availability across multiple outlets

**Expected Behavior**:
- Returns availability for each outlet separately
- Calculates conflicts per outlet
- Returns best outlet with highest availability

**Steps**:
1. Create product in 2 outlets:
   - Outlet 1: `stock = 10`, `renting = 2`, `available = 8`
   - Outlet 2: `stock = 5`, `renting = 0`, `available = 5`
2. Check availability across both outlets
3. Verify: Outlet 1 has `available = 8`, Outlet 2 has `available = 5`

## Running Tests

### Manual Testing

1. **Start the development server**:
   ```bash
   yarn dev
   ```

2. **Use the admin interface** to create orders and update statuses:
   - Navigate to Orders page
   - Create a new order (SALE or RENT)
   - Update order status and verify stock changes

3. **Check database directly**:
   ```bash
   # Connect to database
   npx prisma studio
   # Or use SQL
   SELECT * FROM "OutletStock" WHERE "productId" = <productId>;
   ```

### Automated Testing

Run the test file:
```bash
# Using Jest (if configured)
yarn test tests/product-stock-management.test.js

# Or using Node directly (requires test runner setup)
node tests/product-stock-management.test.js
```

### Sync Script

Before testing, sync existing data:
```bash
node scripts/sync-outlet-stock-available.js
```

This will:
- Recalculate `renting` from actual RENT orders
- Recalculate `available = stock - renting`
- Fix any inconsistencies

## Verification Checklist

After implementing changes, verify:

- [ ] SALE orders decrease `stock` when COMPLETED/PICKUPED
- [ ] SALE orders rollback `stock` when CANCELLED after COMPLETED
- [ ] RENT orders increase `renting` when PICKUPED
- [ ] RENT orders decrease `renting` when RETURNED
- [ ] RENT orders rollback `renting` when CANCELLED
- [ ] `available` always equals `stock - renting` (for RENT)
- [ ] Availability check API returns correct conflicts
- [ ] Multi-outlet availability check works correctly

## Common Issues

### Issue 1: `available` not syncing with `stock - renting`
**Solution**: Run sync script: `node scripts/sync-outlet-stock-available.js`

### Issue 2: Stock not decreasing for SALE orders
**Check**:
- Order status is COMPLETED or PICKUPED
- Order type is SALE (not RENT)
- Order items have valid productId and quantity

### Issue 3: Renting not updating for RENT orders
**Check**:
- Order status transitions are correct (RESERVED → PICKUPED → RETURNED)
- Order type is RENT (not SALE)
- Order items have valid productId and quantity

### Issue 4: Availability check shows wrong conflicts
**Check**:
- Rental dates are provided correctly
- Order dates overlap correctly
- Only RENT orders are counted (SALE orders don't affect rental availability)

## Database Queries for Verification

```sql
-- Check OutletStock consistency
SELECT 
  os.id,
  p.name as product_name,
  o.name as outlet_name,
  os.stock,
  os.renting,
  os.available,
  (os.stock - os.renting) as calculated_available,
  CASE 
    WHEN os.available != (os.stock - os.renting) THEN 'INCONSISTENT'
    ELSE 'OK'
  END as status
FROM "OutletStock" os
JOIN "Product" p ON p.id = os."productId"
JOIN "Outlet" o ON o.id = os."outletId"
WHERE os.available != (os.stock - os.renting);

-- Check actual renting from orders
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
  AND ord.status = 'PICKUPED'
GROUP BY os.id, os."productId", os."outletId", os.renting
HAVING os.renting != COALESCE(SUM(oi.quantity), 0);
```

