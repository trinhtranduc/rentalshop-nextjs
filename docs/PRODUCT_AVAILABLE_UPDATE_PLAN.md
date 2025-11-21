# Product Available Logic Update Plan

Generated: 2025-01-21
Based on: `docs/PRODUCT_AVAILABLE_LOGIC_REVIEW.md`

## Tổng quan

Kế hoạch này implement các fixes được đề xuất trong review document để đảm bảo logic `available` hoạt động đúng theo Odoo best practices.

## Mục tiêu

1. ✅ Fix SALE orders: Giảm `stock` vĩnh viễn khi COMPLETED
2. ✅ Fix RENT orders: Update `renting` và `available` khi status thay đổi
3. ✅ Tách biệt logic RENT vs SALE hoàn toàn
4. ✅ Fix availability check: Tính từ orders thực tế
5. ✅ Add sync function để đảm bảo `available` luôn chính xác

## Implementation Steps

### Phase 1: Create Stock Update Helper Functions

#### Step 1.1: Create `updateOutletStockForOrder` function
**File**: `packages/database/src/product.ts`

**Purpose**: Centralized function để update OutletStock khi order status thay đổi

**Function signature**:
```typescript
async function updateOutletStockForOrder(
  orderId: number,
  oldStatus: string,
  newStatus: string,
  orderType: 'RENT' | 'SALE',
  outletId: number,
  orderItems: Array<{ productId: number; quantity: number }>
): Promise<void>
```

**Logic**:
- Get order hiện tại với orderItems và outletId
- Compare oldStatus vs newStatus để determine action
- Update OutletStock cho từng product trong orderItems
- Handle cả RENT và SALE orders

#### Step 1.2: Create `syncOutletStockAvailable` function
**File**: `packages/database/src/product.ts`

**Purpose**: Recalculate `available = stock - renting` cho một outlet stock

**Function signature**:
```typescript
async function syncOutletStockAvailable(
  productId: number,
  outletId: number
): Promise<void>
```

**Logic**:
- Get OutletStock
- Recalculate: `available = stock - renting`
- Update database

### Phase 2: Fix SALE Order Stock Management

#### Step 2.1: Update `updateOrder` để handle SALE orders
**File**: `packages/database/src/order.ts`

**Changes**:
1. Get order hiện tại trước khi update (để biết oldStatus)
2. After update order, call `updateOutletStockForOrder` nếu status thay đổi
3. Handle SALE orders:
   - COMPLETED/PICKUPED: Decrement `stock` và `available` vĩnh viễn
   - CANCELLED: Rollback `stock` và `available` nếu đã COMPLETED/PICKUPED

**Code location**: After line 434 (after order.update)

#### Step 2.2: Update availability check để tách SALE logic
**File**: `apps/api/app/api/products/availability/route.ts`

**Changes**:
- Tách biệt SALE và RENT orders khi tính availability
- SALE orders: Tính `sold` từ COMPLETED orders, `available = stock - sold`
- RENT orders: Tính `renting` và `reserved` từ PICKUPED/RESERVED orders

**Code location**: Line 234-254

### Phase 3: Fix RENT Order Renting Update

#### Step 3.1: Update `updateOrder` để handle RENT orders
**File**: `packages/database/src/order.ts`

**Changes**:
- Handle RENT orders trong `updateOutletStockForOrder`:
  - RESERVED: Decrement `available` (reserved), `renting` và `stock` không đổi
  - PICKUPED: Increment `renting`, decrement `available`, `stock` không đổi
  - RETURNED: Decrement `renting`, increment `available`, `stock` không đổi
  - CANCELLED: Rollback based on previous status

**Code location**: Same as Step 2.1

#### Step 3.2: Handle status transitions
**Logic**:
- RESERVED → PICKUPED: `renting` tăng, `available` giảm thêm
- PICKUPED → RETURNED: `renting` giảm, `available` tăng
- PICKUPED → CANCELLED: `renting` giảm, `available` tăng
- RESERVED → CANCELLED: `available` tăng (rollback reserved)

### Phase 4: Fix Availability Check Logic

#### Step 4.1: Fix `/api/products/[id]/availability`
**File**: `apps/api/app/api/products/[id]/availability/route.ts`

**Changes**:
1. Tính `totalAvailable` từ orders thực tế, không dùng `outletStock.available` làm base
2. Tách biệt:
   - **RENT**: `available = stock - renting - reserved` (từ orders)
   - **SALE**: `available = stock - sold` (từ COMPLETED orders)
3. Đảm bảo check đúng outlet khi tính conflicts

**Code location**: Line 155-434

#### Step 4.2: Fix `/api/products/availability` (multi-outlet)
**File**: `apps/api/app/api/products/availability/route.ts`

**Changes**: Tương tự Step 4.1, nhưng cho multiple outlets

**Code location**: Line 227-256

### Phase 5: Add Sync Function & Cleanup

#### Step 5.1: Create sync function
**File**: `packages/database/src/product.ts`

**Function**: `syncOutletStockAvailable(productId, outletId)`

**Usage**: Gọi sau mỗi lần update `renting` hoặc `stock` để đảm bảo `available` sync

#### Step 5.2: Create bulk sync script
**File**: `scripts/sync-outlet-stock-available.js`

**Purpose**: Script để sync tất cả OutletStock.available cho existing data

**Logic**:
- Query tất cả OutletStock
- Recalculate `available = stock - renting`
- Update database

### Phase 6: Testing

#### Step 6.1: Test SALE Order Stock Decrease
- Create SALE order với quantity 2
- Status → COMPLETED
- Verify: `stock` giảm 2, `available` giảm 2
- Cancel order
- Verify: `stock` và `available` rollback

#### Step 6.2: Test RENT Order Renting Update
- Create RENT order với quantity 1
- Status → RESERVED
- Verify: `available` giảm 1, `renting` = 0, `stock` không đổi
- Status → PICKUPED
- Verify: `renting` tăng 1, `available` giảm thêm 1, `stock` không đổi
- Status → RETURNED
- Verify: `renting` giảm 1, `available` tăng 1, `stock` không đổi

#### Step 6.3: Test Availability Check với Rental Dates
- Create RENT order với dates 2025-01-10 to 2025-01-15
- Check availability cho dates 2025-01-12 to 2025-01-14
- Verify: Conflicts được tính đúng, available giảm đúng

#### Step 6.4: Test Multiple Outlets
- Product có stock ở 2 outlets
- Create order ở outlet 1
- Verify: Chỉ outlet 1 bị ảnh hưởng, outlet 2 không đổi

## Files to Modify

### Critical Changes

1. **`packages/database/src/product.ts`** (NEW functions)
   - `updateOutletStockForOrder()` - Main function để update stock/renting
   - `syncOutletStockAvailable()` - Sync available field
   - Export functions để sử dụng trong order.ts

2. **`packages/database/src/order.ts`** (MODIFY)
   - `updateOrder()` - Add logic gọi `updateOutletStockForOrder` sau khi update order
   - Get old order status trước khi update
   - Handle status transitions

3. **`apps/api/app/api/products/[id]/availability/route.ts`** (MODIFY)
   - Fix availability calculation logic
   - Tách biệt RENT vs SALE
   - Tính từ orders thực tế

4. **`apps/api/app/api/products/availability/route.ts`** (MODIFY)
   - Fix multi-outlet availability calculation
   - Tách biệt RENT vs SALE

### Supporting Changes

5. **`scripts/sync-outlet-stock-available.js`** (NEW)
   - Script để sync existing data

6. **`docs/PRODUCT_AVAILABLE_LOGIC_REVIEW.md`** (UPDATE)
   - Mark issues as fixed
   - Update implementation status

## Implementation Details

### Status Transition Matrix

#### SALE Orders:
| From | To | Action |
|------|-----|--------|
| RESERVED | COMPLETED | Decrement `stock`, decrement `available` |
| RESERVED | CANCELLED | No change (chưa bán) |
| COMPLETED | CANCELLED | Increment `stock`, increment `available` (rollback) |

#### RENT Orders:
| From | To | Action |
|------|-----|--------|
| RESERVED | PICKUPED | Increment `renting`, decrement `available` |
| RESERVED | CANCELLED | Increment `available` (rollback reserved) |
| PICKUPED | RETURNED | Decrement `renting`, increment `available` |
| PICKUPED | CANCELLED | Decrement `renting`, increment `available` (rollback) |
| RETURNED | CANCELLED | No change (đã trả lại) |

### Error Handling

- Validate order exists trước khi update stock
- Validate outlet stock exists
- Handle concurrent updates (transaction)
- Rollback nếu có lỗi
- Log tất cả stock changes để audit

### Performance Considerations

- Batch update nếu có nhiều orderItems
- Use transactions để ensure consistency
- Index `outletStock` trên `(productId, outletId)` (đã có)
- Cache calculations nếu cần

## Testing Strategy

### Unit Tests
- Test `updateOutletStockForOrder` với các status transitions
- Test `syncOutletStockAvailable`
- Test edge cases (negative stock, etc.)

### Integration Tests
- Test full order flow: Create → Update Status → Verify Stock
- Test với multiple products và outlets
- Test concurrent updates

### Manual Testing
- Test với real data
- Verify availability check accuracy
- Test với rental dates conflicts

## Rollout Plan

1. **Development**: Implement và test locally
2. **Staging**: Deploy và test với staging data
3. **Data Migration**: Run sync script để fix existing data
4. **Production**: Deploy với monitoring
5. **Verification**: Verify stock accuracy sau deployment

## Rollback Plan

- Nếu có issues, có thể rollback code changes
- Data changes là permanent, nhưng có thể recalculate từ orders
- Sync script có thể chạy lại để fix data

## Success Criteria

1. ✅ SALE orders giảm `stock` khi COMPLETED
2. ✅ RENT orders update `renting` khi status thay đổi
3. ✅ `available` luôn sync với `stock - renting`
4. ✅ Availability check chính xác với rental dates
5. ✅ Tách biệt hoàn toàn logic RENT vs SALE
6. ✅ All tests pass
7. ✅ No data inconsistencies

## Timeline Estimate

- Phase 1: 2-3 hours (Helper functions)
- Phase 2: 2-3 hours (SALE logic)
- Phase 3: 2-3 hours (RENT logic)
- Phase 4: 2-3 hours (Availability check)
- Phase 5: 1-2 hours (Sync function)
- Phase 6: 2-3 hours (Testing)
- **Total**: ~12-18 hours

## Notes

- Cần careful với concurrent updates
- Cần test thoroughly với real scenarios
- Cần monitor sau khi deploy
- Có thể cần adjust logic based on real usage

