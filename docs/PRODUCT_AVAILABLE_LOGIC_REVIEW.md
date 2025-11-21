# Product Available Logic Review

Generated: 2025-01-21

## Mục đích
Review toàn diện logic tính `available` cho sản phẩm, đảm bảo phù hợp với thực tế và best practices từ Odoo.

## 1. Current Logic Overview

### 1.1 OutletStock Model
```prisma
model OutletStock {
  id        Int      @id @default(autoincrement())
  stock     Int      @default(0)      // Tổng số lượng trong kho
  available Int      @default(0)      // Số lượng có sẵn
  renting   Int      @default(0)      // Số lượng đang cho thuê
  productId Int
  outletId  Int
}
```

**Công thức hiện tại**: `available = stock - renting` (theo schema và comments)

### 1.2 Khi Tạo Product Mới
- Location: `apps/api/app/api/products/route.ts` (line 539-544)
- Logic: 
  ```typescript
  outletStock: {
    create: outletStock.map(os => ({
      outlet: { connect: { id: os.outletId } },
      stock: os.stock,
      available: os.stock,  // ✅ FIXED: available = stock khi tạo mới
      renting: 0
    }))
  }
  ```
- Status: ✅ Đã fix - `available` được set = `stock` khi tạo product

### 1.3 Khi Update Stock
- Location: `packages/database/src/product.ts` (updateProductStock)
- Logic:
  ```typescript
  update: {
    stock: { increment: stockChange },
    available: { increment: stockChange },  // ✅ Sync với stock
  }
  ```
- Status: ✅ Đúng - `available` được sync với `stock` khi update

### 1.4 Khi Order Status Thay Đổi
- Location: `packages/database/src/order.ts` (updateOrder)
- **VẤN ĐỀ**: Không có logic update `renting` hoặc `stock` khi order status thay đổi
- Status: ❌ **BUG** - `renting` và `stock` không được update

### 1.5 Availability Check khi Add vào Cart

#### API: `/api/products/[id]/availability`
- Location: `apps/api/app/api/products/[id]/availability/route.ts`
- Logic hiện tại:
  1. Lấy `outletStock.available` từ database
  2. Tính `totalRented` và `totalReserved` từ orders thực tế
  3. Tính `totalAvailable = totalStock - totalRented - totalReserved`
  4. Nếu có rental dates: tính conflicts và `effectivelyAvailable = totalAvailableStock - conflictingQuantity`

**Vấn đề**:
- Dùng `outletStock.available` làm base, nhưng field này có thể không chính xác
- Tính lại từ orders là đúng, nhưng nên dùng kết quả tính lại thay vì `outletStock.available`

#### Frontend: CreateOrderForm
- Location: `packages/ui/src/components/forms/CreateOrderForm/CreateOrderForm.tsx`
- Logic: Gọi API với rental dates (nếu RENT order)
- Status: ✅ Đúng - có gọi API với dates

## 2. Odoo Best Practices (Research)

### 2.1 SALE Orders (Bán hàng)
- **Khi order status → PICKUPED/COMPLETED**: 
  - `stock` giảm **vĩnh viễn** (đã bán, không trả lại)
  - Sản phẩm không còn trong kho nữa
  - **KHÔNG** dùng `renting` field (vì không phải cho thuê)

### 2.2 RENT Orders (Cho thuê)
- **Khi order status → RESERVED**: 
  - `available` giảm (reserved - tạm thời)
  - `stock` không đổi
- **Khi order status → PICKUPED**: 
  - `renting` tăng
  - `available` giảm
  - `stock` không đổi (chỉ tạm thời cho thuê)
- **Khi order status → RETURNED**: 
  - `renting` giảm
  - `available` tăng lại
  - `stock` không đổi

### 2.3 Stock Management Formula
- **RENT**: `available = stock - renting - reserved`
- **SALE**: `available = stock - sold` (nếu track sold separately)
- **Tổng quát**: `available = stock - (renting + reserved + sold)`

## 3. Issues Found

### 3.1 Critical Issues

#### Issue 1: SALE Orders Không Giảm Stock
- **Location**: `packages/database/src/order.ts` (updateOrder)
- **Problem**: Khi SALE order status → COMPLETED, `stock` không được giảm
- **Impact**: Stock không chính xác, có thể bán quá số lượng thực tế
- **Expected**: `stock` phải giảm vĩnh viễn khi SALE order COMPLETED

#### Issue 2: RENT Orders Không Update Renting
- **Location**: `packages/database/src/order.ts` (updateOrder)
- **Problem**: Khi RENT order status thay đổi, `renting` không được update
- **Impact**: `available` không chính xác, không phản ánh số lượng thực tế đang cho thuê
- **Expected**: 
  - PICKUPED: `renting` tăng, `available` giảm
  - RETURNED: `renting` giảm, `available` tăng
  - CANCELLED: rollback nếu đã PICKUPED

#### Issue 3: SALE Orders Dùng Renting Field
- **Location**: `apps/api/app/api/products/availability/route.ts` (line 243-250)
- **Problem**: SALE orders đang được tính vào `totalRented` (dùng `renting` logic)
- **Impact**: Logic không đúng, SALE nên giảm `stock` trực tiếp, không dùng `renting`
- **Expected**: SALE orders không nên dùng `renting` field

### 3.2 Medium Issues

#### Issue 4: Available Không Sync
- **Location**: Multiple places
- **Problem**: `available` có thể không sync với `stock - renting` sau khi orders thay đổi
- **Impact**: Data inconsistency
- **Expected**: `available` luôn = `stock - renting` (cho RENT) hoặc `stock - sold` (cho SALE)

#### Issue 5: Availability Check Dùng Cached Value
- **Location**: `apps/api/app/api/products/[id]/availability/route.ts`
- **Problem**: Dùng `outletStock.available` làm base, nhưng tính lại từ orders
- **Impact**: Có thể dẫn đến confusion, nên dùng kết quả tính lại
- **Expected**: Tính từ orders thực tế, không dùng cached `available`

### 3.3 Low Issues

#### Issue 6: Không Tách Biệt RENT vs SALE Logic
- **Location**: Multiple places
- **Problem**: Logic không tách biệt rõ ràng giữa RENT (temporary) và SALE (permanent)
- **Impact**: Code khó maintain, dễ bug
- **Expected**: Tách biệt hoàn toàn logic RENT và SALE

## 4. Recommended Fixes

### 4.1 Fix SALE Order Stock Management
**Priority**: Critical

1. Khi SALE order status → PICKUPED/COMPLETED:
   - Decrement `stock` vĩnh viễn
   - Decrement `available` (vì `available = stock - ...`)
   - **KHÔNG** update `renting` (SALE không dùng renting)

2. Khi SALE order status → CANCELLED:
   - Rollback `stock` nếu đã PICKUPED/COMPLETED
   - Rollback `available`

### 4.2 Fix RENT Order Renting Update
**Priority**: Critical

1. Khi RENT order status → RESERVED:
   - Decrement `available` (reserved)
   - `stock` và `renting` không đổi

2. Khi RENT order status → PICKUPED:
   - Increment `renting`
   - Decrement `available`
   - `stock` không đổi

3. Khi RENT order status → RETURNED:
   - Decrement `renting`
   - Increment `available`
   - `stock` không đổi

4. Khi RENT order status → CANCELLED:
   - Rollback `renting` và `available` nếu đã PICKUPED
   - Rollback `available` nếu chỉ RESERVED

### 4.3 Fix Availability Check Logic
**Priority**: Medium

1. Tính `totalAvailable` từ orders thực tế, không dùng `outletStock.available`
2. Tách biệt logic:
   - **RENT**: `available = stock - renting - reserved` (từ orders)
   - **SALE**: `available = stock - sold` (từ COMPLETED orders)
3. Đảm bảo check đúng outlet khi tính conflicts

### 4.4 Add Sync Function
**Priority**: Medium

1. Tạo function `syncOutletStockAvailable()` để recalculate `available`
2. Gọi function này sau mỗi lần update `renting` hoặc `stock`
3. Hoặc dùng database trigger/computed field

## 5. Implementation Plan

### Phase 1: Fix Critical Issues
1. ✅ Fix `available` khi tạo product (đã fix)
2. ⏳ Fix SALE order stock management
3. ⏳ Fix RENT order renting update

### Phase 2: Fix Medium Issues
4. ⏳ Fix availability check logic
5. ⏳ Add sync function

### Phase 3: Testing & Documentation
6. ⏳ Add tests
7. ⏳ Update documentation

## 6. Files to Modify

1. `packages/database/src/order.ts` - Add stock/renting update logic
2. `apps/api/app/api/products/[id]/availability/route.ts` - Fix availability calculation
3. `apps/api/app/api/products/availability/route.ts` - Fix multi-outlet availability
4. `packages/database/src/product.ts` - Add sync function (optional)

## 7. Test Cases

### Test 1: SALE Order Stock Decrease
- Create SALE order with quantity 2
- Status → COMPLETED
- Verify: `stock` giảm 2, `available` giảm 2
- Cancel order
- Verify: `stock` và `available` rollback

### Test 2: RENT Order Renting Update
- Create RENT order with quantity 1
- Status → RESERVED
- Verify: `available` giảm 1, `renting` = 0, `stock` không đổi
- Status → PICKUPED
- Verify: `renting` tăng 1, `available` giảm thêm 1, `stock` không đổi
- Status → RETURNED
- Verify: `renting` giảm 1, `available` tăng 1, `stock` không đổi

### Test 3: Availability Check với Rental Dates
- Create RENT order với dates 2025-01-10 to 2025-01-15
- Check availability cho dates 2025-01-12 to 2025-01-14
- Verify: Conflicts được tính đúng, available giảm đúng

### Test 4: Multiple Outlets
- Product có stock ở 2 outlets
- Create order ở outlet 1
- Verify: Chỉ outlet 1 bị ảnh hưởng, outlet 2 không đổi

## 8. Notes

- `stock` = permanent inventory (tổng số lượng sản phẩm)
- `renting` = temporary (chỉ cho RENT orders)
- `available` = computed field, phụ thuộc vào order type:
  - RENT: `available = stock - renting - reserved`
  - SALE: `available = stock - sold`
- Mỗi outlet có stock riêng, tính độc lập

