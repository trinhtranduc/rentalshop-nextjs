# Plan Limit Addon Deletion Issue - Phân Tích & Giải Pháp

## 🔍 **Vấn Đề**

### **Mô tả lỗi:**
1. Merchant có plan Professional (có limit, ví dụ: orders = 1000)
2. Tạo đơn không vấn đề ✅
3. Admin tạo plan addon (ví dụ: orders = 500) → Total limit = 1500
4. Tạo đơn không vấn đề ✅
5. Admin xóa plan addon → Total limit = 1000
6. Tạo đơn bị lỗi limit ❌

### **Root Cause:**

**Vấn đề chính:** Khi xóa plan limit addon, hệ thống không kiểm tra xem merchant hiện tại có đang sử dụng limit từ addon đó không.

**Scenario cụ thể:**
```
1. Base plan: orders = 1000
2. Admin tạo addon: orders = 500
   → Total limit = 1000 + 500 = 1500
3. Merchant tạo orders trong phạm vi 1000-1500
   → Current count = 1200 (ví dụ)
4. Admin xóa addon
   → Total limit = 1000 (chỉ còn base plan)
5. Current count = 1200 > 1000 → LỖI khi tạo order mới
```

### **Luồng Xử Lý Hiện Tại:**

```typescript
// apps/api/app/api/plan-limit-addons/[id]/route.ts
export async function DELETE(...) {
  // ❌ THIẾU: Không kiểm tra current counts trước khi xóa
  const existingAddon = await db.planLimitAddons.findById(id);
  await db.planLimitAddons.delete(id); // Hard delete ngay
  return success;
}
```

```typescript
// packages/utils/src/core/validation.ts
export async function getPlanLimitsInfo(merchantId: number) {
  // Tính total limit = base plan + active addons
  const addonLimits = await db.planLimitAddons.calculateTotal(merchantId);
  const totalLimits = {
    orders: calculateTotalLimit(planLimits.orders, addonLimits.orders)
  };
  // ❌ Nếu addon đã bị xóa, total limit sẽ giảm đột ngột
  // ❌ Nhưng current count không thay đổi → current > limit
}
```

## 🛠️ **Giải Pháp**

### **Giải Pháp 1: Validation Trước Khi Xóa (Khuyến Nghị)**

**Logic:**
1. Trước khi xóa addon, kiểm tra current counts của merchant
2. Tính toán total limit sau khi xóa addon (base + remaining addons)
3. Nếu current count > new total limit → **Ngăn chặn xóa** hoặc cảnh báo

**Implementation:**

```typescript
// apps/api/app/api/plan-limit-addons/[id]/route.ts
export async function DELETE(...) {
  // 1. Get addon info
  const existingAddon = await db.planLimitAddons.findById(id);
  if (!existingAddon) {
    return ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND');
  }

  // 2. ✅ NEW: Validate deletion won't cause limit exceeded
  const { getPlanLimitsInfo, getCurrentEntityCounts } = await import('@rentalshop/utils');
  const currentCounts = await getCurrentEntityCounts(existingAddon.merchantId);
  
  // 3. Get current total limits (with this addon)
  const currentPlanInfo = await getPlanLimitsInfo(existingAddon.merchantId);
  
  // 4. Calculate what limits will be after deletion
  // (Remove this addon's limits from total)
  const addonToRemove = {
    outlets: existingAddon.outlets,
    users: existingAddon.users,
    products: existingAddon.products,
    customers: existingAddon.customers,
    orders: existingAddon.orders,
  };
  
  const futureLimits = {
    outlets: currentPlanInfo.totalLimits.outlets - addonToRemove.outlets,
    users: currentPlanInfo.totalLimits.users - addonToRemove.users,
    products: currentPlanInfo.totalLimits.products - addonToRemove.products,
    customers: currentPlanInfo.totalLimits.customers - addonToRemove.customers,
    orders: currentPlanInfo.totalLimits.orders - addonToRemove.orders,
  };
  
  // 5. Check if deletion would cause limit exceeded
  const exceededLimits: string[] = [];
  
  if (futureLimits.outlets !== -1 && currentCounts.outlets > futureLimits.outlets) {
    exceededLimits.push(`outlets (${currentCounts.outlets} > ${futureLimits.outlets})`);
  }
  if (futureLimits.users !== -1 && currentCounts.users > futureLimits.users) {
    exceededLimits.push(`users (${currentCounts.users} > ${futureLimits.users})`);
  }
  if (futureLimits.products !== -1 && currentCounts.products > futureLimits.products) {
    exceededLimits.push(`products (${currentCounts.products} > ${futureLimits.products})`);
  }
  if (futureLimits.customers !== -1 && currentCounts.customers > futureLimits.customers) {
    exceededLimits.push(`customers (${currentCounts.customers} > ${futureLimits.customers})`);
  }
  if (futureLimits.orders !== -1 && currentCounts.orders > futureLimits.orders) {
    exceededLimits.push(`orders (${currentCounts.orders} > ${futureLimits.orders})`);
  }
  
  // 6. Prevent deletion if limits would be exceeded
  if (exceededLimits.length > 0) {
    return NextResponse.json(
      ResponseBuilder.error('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED', {
        exceededLimits,
        currentCounts,
        futureLimits,
        message: `Cannot delete addon: Current usage exceeds limits after deletion. Exceeded: ${exceededLimits.join(', ')}`
      }),
      { status: 422 }
    );
  }
  
  // 7. Safe to delete
  await db.planLimitAddons.delete(id);
  return ResponseBuilder.success('PLAN_LIMIT_ADDON_DELETED_SUCCESS');
}
```

### **Giải Pháp 2: Soft Delete Thay Vì Hard Delete**

**Logic:**
- Thay vì hard delete, set `isActive: false`
- `calculateTotalAddonLimits` chỉ tính các addon có `isActive: true`
- Có thể khôi phục addon sau này nếu cần

**Advantages:**
- Dễ khôi phục
- Có thể audit history
- Vẫn giữ data để reference

**Disadvantages:**
- Database tích lũy data
- Cần cleanup strategy

### **Giải Pháp 3: Warning + Confirmation (Hỗn Hợp)**

**Logic:**
1. Kiểm tra như Solution 1
2. Nếu có risk → Trả về warning với thông tin chi tiết
3. Admin phải confirm với force flag để xóa
4. Log warning để audit

## ✅ **Giải Pháp Được Chọn: Solution 1 + Solution 2**

**Lý do:**
1. **Solution 1**: Ngăn chặn xóa khi gây lỗi → Bảo vệ data integrity
2. **Solution 2**: Thay đổi sang soft delete → Dễ khôi phục và audit

**Implementation Plan:**

### **Bước 1: Thêm Validation Logic**
- Tạo function `validateAddonDeletion()` trong `packages/utils/src/core/validation.ts`
- Function này kiểm tra current counts vs future limits

### **Bước 2: Update Delete API**
- Sử dụng validation trước khi xóa
- Trả về error code `CANNOT_DELETE_ADDON_LIMIT_EXCEEDED` nếu có risk

### **Bước 3: Update Delete Function (Optional)**
- Có thể thay đổi từ hard delete sang soft delete (`isActive: false`)
- Hoặc giữ hard delete nhưng có validation

### **Bước 4: Add Error Translation**
- Thêm translation cho error code mới

## 📋 **Checklist Implementation**

- [ ] Tạo function `validateAddonDeletion()` trong validation.ts
- [ ] Update DELETE API để sử dụng validation
- [ ] Test với scenario: delete addon khi current count > base limit
- [ ] Test với scenario: delete addon khi current count < base limit (should work)
- [ ] Add error translation cho `CANNOT_DELETE_ADDON_LIMIT_EXCEEDED`
- [ ] Update frontend để hiển thị warning trước khi xóa
- [ ] Document new behavior

## 🧪 **Test Cases**

### **Test Case 1: Safe Deletion**
```
Setup:
- Base plan: orders = 1000
- Addon: orders = 500
- Current count: 800
Expected: ✅ Can delete (800 < 1000)
```

### **Test Case 2: Unsafe Deletion**
```
Setup:
- Base plan: orders = 1000
- Addon: orders = 500
- Current count: 1200
Expected: ❌ Cannot delete (1200 > 1000)
```

### **Test Case 3: Multiple Addons**
```
Setup:
- Base plan: orders = 1000
- Addon 1: orders = 300
- Addon 2: orders = 200
- Current count: 1200
- Delete Addon 1 → Future limit = 1200
Expected: ✅ Can delete (1200 = 1200, no exceeded)
```

### **Test Case 4: Unlimited Base Plan**
```
Setup:
- Base plan: orders = -1 (unlimited)
- Addon: orders = 500
- Current count: 1500
- Delete Addon → Future limit = -1 (unlimited)
Expected: ✅ Can delete (unlimited = no limit)
```

## 🔗 **Related Files**

- `apps/api/app/api/plan-limit-addons/[id]/route.ts` - DELETE endpoint
- `packages/database/src/plan-limit-addon.ts` - Delete function
- `packages/utils/src/core/validation.ts` - Plan limits calculation
- `packages/utils/src/core/validation.ts` - `getPlanLimitsInfo()`

## 📝 **Notes**

- **Current behavior**: Hard delete không có validation → Gây lỗi
- **New behavior**: Validation trước khi xóa → Ngăn chặn lỗi
- **Backward compatibility**: Không ảnh hưởng, chỉ thêm validation layer
- **Performance**: Validation query nhẹ, không ảnh hưởng đáng kể

