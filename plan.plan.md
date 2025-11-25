# Plan Model Synchronization Plan

## 🎯 **Mục tiêu**

Đồng bộ hóa Plan model trên toàn bộ codebase để đảm bảo:
- **Single Source of Truth** cho Plan structure
- **Consistent naming** giữa database schema, types, và components
- **Type safety** với TypeScript
- **DRY principles** - không duplicate code/definitions

---

## 📊 **Phân tích hiện trạng**

### **1. Database Schema (Prisma) ✅ CHUẨN**

```prisma
model Plan {
  id            Int            @id @default(autoincrement())
  name          String         @unique
  description   String
  basePrice     Float
  currency      String         @default("USD")
  trialDays     Int            @default(14)
  limits        String         @default("{\"outlets\": 0, \"users\": 0, \"products\": 0, \"customers\": 0}")
  features      String         @default("[]")
  isActive      Boolean        @default(true)
  isPopular     Boolean        @default(false)
  sortOrder     Int            @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?
}
```

**✅ Điểm mạnh:**
- Schema rõ ràng, không có field `pricing` (pricing được tính toán động)
- `limits` và `features` lưu dạng JSON string (đúng cho Prisma)

### **2. Plan Interface (packages/types/src/plans/plan.ts) ⚠️ CẦN ĐỒNG BỘ**

```typescript
export interface Plan {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  trialDays: number;
  limits: PlanLimits;           // ✅ Parsed from JSON
  features: string[];            // ✅ Parsed from JSON
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  pricing: {                     // ⚠️ Tính toán động, không có trong DB
    monthly: PlanPricing;
    quarterly: PlanPricing;
    sixMonths: PlanPricing;      // ⚠️ Inconsistency: "sixMonths" vs "semi_annual"
    yearly: PlanPricing;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**⚠️ Vấn đề:**
- `pricing.sixMonths` không khớp với `BillingCycle` type có `semi_annual`
- Thiếu field `mobileOnly` (có trong PlanForm nhưng chưa có trong type)

### **3. BillingCycle Types ⚠️ INCONSISTENCY**

**Type definition:**
```typescript
export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
```

**Constants (packages/constants/src/subscription.ts):**
```typescript
export const BILLING_CYCLES = {
  MONTHLY: { id: 'monthly', ... },
  QUARTERLY: { id: 'quarterly', ... },
  YEARLY: { id: 'yearly', ... }      // ⚠️ Thiếu SEMI_ANNUAL
};

export const BILLING_CYCLES_ARRAY = [
  { value: 'monthly', ... },
  { value: 'quarterly', ... },
  { value: 'semi_annual', ... },     // ✅ Có semi_annual
  { value: 'annual', ... }            // ⚠️ "annual" vs "yearly" inconsistency
];
```

**⚠️ Vấn đề:**
- `BILLING_CYCLES` object thiếu `SEMI_ANNUAL`
- `BILLING_CYCLES_ARRAY` có `semi_annual` nhưng object không có
- `BILLING_CYCLES.YEARLY.id` = `'yearly'` nhưng type có `'annual'`

### **4. Database Functions (packages/database/src/plan.ts) ⚠️ THIẾU sixMonths**

```typescript
function generatePlanPricing(basePrice: number) {
  return {
    monthly: { price: basePrice, discount: 0, savings: 0 },
    quarterly: { price: basePrice * 3 * 0.95, discount: 5, savings: ... },
    yearly: { price: basePrice * 12 * 0.85, discount: 15, savings: ... }
    // ⚠️ Thiếu sixMonths/semi_annual
  };
}
```

### **5. PlanForm Component ⚠️ FIELD MOBILEONLY KHÔNG KHỚP**

```typescript
interface PlanFormData {
  // ...
  mobileOnly: boolean;  // ⚠️ Field này không có trong Plan interface
  // ...
}
```

### **6. PlanDetails Interface (deprecated?) ⚠️ DUPLICATE**

```typescript
// packages/types/src/entities/merchant.ts
export interface PlanDetails {
  id: number;
  name: string;
  maxOutlets: number;    // ⚠️ Khác với Plan.limits.outlets
  maxUsers: number;      // ⚠️ Khác với Plan.limits.users
  // ... không khớp với Plan interface
}
```

---

## 🔧 **Kế hoạch đồng bộ hóa**

### **Phase 1: Standardize Billing Cycle Naming** ✅ PRIORITY

#### **1.1 Đồng bộ BillingCycle type và constants**

**File:** `packages/types/src/plans/plan.ts`

```typescript
// ✅ Standardize: Use 'annual' instead of 'yearly' everywhere
export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
```

**File:** `packages/constants/src/subscription.ts`

```typescript
// ✅ Add SEMI_ANNUAL to BILLING_CYCLES object
export const BILLING_CYCLES = {
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly',
    duration: 1,
    unit: 'month',
    discount: 0
  },
  QUARTERLY: {
    id: 'quarterly',
    name: 'Quarterly',
    duration: 3,
    unit: 'months',
    discount: 0.05
  },
  SEMI_ANNUAL: {                    // ✅ ADD THIS
    id: 'semi_annual',
    name: 'Semi-Annual',
    duration: 6,
    unit: 'months',
    discount: 0.10
  },
  ANNUAL: {                         // ✅ Rename YEARLY to ANNUAL
    id: 'annual',                   // ✅ Change from 'yearly' to 'annual'
    name: 'Annual',
    duration: 12,
    unit: 'months',
    discount: 0.20
  }
};

// ✅ Update BILLING_CYCLES_ARRAY to match
export const BILLING_CYCLES_ARRAY = [
  {
    value: 'monthly' as const,
    label: BILLING_CYCLES.MONTHLY.name,
    months: BILLING_CYCLES.MONTHLY.duration,
    discount: BILLING_CYCLES.MONTHLY.discount * 100,
    description: 'Pay monthly, cancel anytime'
  },
  {
    value: 'quarterly' as const,
    label: BILLING_CYCLES.QUARTERLY.name,
    months: BILLING_CYCLES.QUARTERLY.duration,
    discount: BILLING_CYCLES.QUARTERLY.discount * 100,
    description: `Save ${BILLING_CYCLES.QUARTERLY.discount * 100}% with quarterly billing`
  },
  {
    value: 'semi_annual' as const,  // ✅ Already correct
    label: BILLING_CYCLES.SEMI_ANNUAL.name,
    months: BILLING_CYCLES.SEMI_ANNUAL.duration,
    discount: BILLING_CYCLES.SEMI_ANNUAL.discount * 100,
    description: `Save ${BILLING_CYCLES.SEMI_ANNUAL.discount * 100}% with semi-annual billing`
  },
  {
    value: 'annual' as const,       // ✅ Change from 'yearly' to 'annual'
    label: BILLING_CYCLES.ANNUAL.name,
    months: BILLING_CYCLES.ANNUAL.duration,
    discount: BILLING_CYCLES.ANNUAL.discount * 100,
    description: `Save ${BILLING_CYCLES.ANNUAL.discount * 100}% with annual billing`
  }
];
```

#### **1.2 Đồng bộ Plan.pricing structure**

**File:** `packages/types/src/plans/plan.ts`

```typescript
export interface Plan {
  // ... existing fields ...
  pricing: {
    monthly: PlanPricing;
    quarterly: PlanPricing;
    semi_annual: PlanPricing;    // ✅ Change from 'sixMonths' to 'semi_annual'
    annual: PlanPricing;          // ✅ Change from 'yearly' to 'annual'
  };
}
```

### **Phase 2: Update Database Functions** ✅ PRIORITY

#### **2.1 Cập nhật generatePlanPricing()**

**File:** `packages/database/src/plan.ts`

```typescript
function generatePlanPricing(basePrice: number) {
  return {
    monthly: {
      price: basePrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: basePrice * 3 * 0.95, // 5% discount
      discount: 5,
      savings: basePrice * 3 * 0.05
    },
    semi_annual: {                    // ✅ ADD THIS
      price: basePrice * 6 * 0.90,   // 10% discount
      discount: 10,
      savings: basePrice * 6 * 0.10
    },
    annual: {                         // ✅ Change from 'yearly' to 'annual'
      price: basePrice * 12 * 0.80,  // 20% discount (updated from 15%)
      discount: 20,                   // ✅ Updated from 15% to match constants
      savings: basePrice * 12 * 0.20
    }
  };
}
```

### **Phase 3: Standardize Plan Interface** ✅ PRIORITY

#### **3.1 Thêm mobileOnly field (nếu cần)**

**Option A: Thêm vào Plan interface nếu business logic cần**

**File:** `packages/types/src/plans/plan.ts`

```typescript
export interface Plan {
  // ... existing fields ...
  mobileOnly?: boolean;  // Optional field for mobile-only plans
}
```

**Option B: Xóa khỏi PlanForm nếu không cần**

Nếu `mobileOnly` không cần thiết, xóa khỏi `PlanForm.tsx`

#### **3.2 Đảm bảo PlanLimits consistency**

**File:** `packages/types/src/plans/plan.ts`

```typescript
export interface PlanLimits {
  outlets: number;      // ✅ Already matches
  users: number;        // ✅ Already matches
  products: number;     // ✅ Already matches
  customers: number;    // ✅ Already matches
  orders: number;       // ✅ Already matches (newly added)
  allowWebAccess?: boolean;    // ✅ Optional field
  allowMobileAccess?: boolean; // ✅ Optional field
}
```

### **Phase 4: Deprecate/Update PlanDetails** ⚠️ OPTIONAL

#### **4.1 Deprecate PlanDetails hoặc align với Plan**

**Option A: Deprecate và dùng Plan thay thế**

**File:** `packages/types/src/entities/merchant.ts`

```typescript
/**
 * @deprecated Use Plan from @rentalshop/types/plans/plan instead
 * This interface is kept for backward compatibility only
 */
export interface PlanDetails {
  // ... existing fields ...
}
```

**Option B: Convert PlanDetails sang Plan**

Tìm tất cả usages của `PlanDetails` và thay bằng `Plan` interface.

### **Phase 5: Update All Usages** ✅ REQUIRED

#### **5.1 Tìm và cập nhật tất cả references**

**Files cần kiểm tra:**
- `packages/database/src/subscription.ts` - `generatePricingFromBasePrice()`
- `packages/ui/src/components/forms/PlanForm.tsx` - Pricing structure
- `packages/ui/src/components/features/Plans/**` - All plan components
- `apps/admin/app/plans/**` - Admin plan pages
- `apps/api/app/api/plans/**` - Plan API routes

**Search patterns:**
```bash
# Tìm "sixMonths"
grep -r "sixMonths" packages/ apps/

# Tìm "yearly" (cần đổi thành "annual")
grep -r "yearly" packages/ apps/ --exclude-dir=node_modules

# Tìm PlanDetails
grep -r "PlanDetails" packages/ apps/

# Tìm pricing.yearly
grep -r "pricing\.yearly" packages/ apps/
```

#### **5.2 Update PlanForm component**

**File:** `packages/ui/src/components/forms/PlanForm.tsx`

```typescript
// ✅ Update pricing references
// Change: pricing.yearly → pricing.annual
// Change: pricing.sixMonths → pricing.semi_annual
```

#### **5.3 Update API routes**

**Files:** `apps/api/app/api/plans/**/route.ts`

Đảm bảo tất cả API responses trả về đúng structure với `pricing.semi_annual` và `pricing.annual`.

---

## ✅ **Checklist Implementation**

### **Step 1: Update Constants** ⏳ TODO
- [ ] Thêm `SEMI_ANNUAL` vào `BILLING_CYCLES` object
- [ ] Đổi `YEARLY` → `ANNUAL` trong `BILLING_CYCLES`
- [ ] Đổi `'yearly'` → `'annual'` trong `BILLING_CYCLES_ARRAY`
- [ ] Cập nhật discount values để match (20% cho annual)

### **Step 2: Update Types** ⏳ TODO
- [ ] Đổi `pricing.sixMonths` → `pricing.semi_annual` trong Plan interface
- [ ] Đổi `pricing.yearly` → `pricing.annual` trong Plan interface
- [ ] Quyết định và implement `mobileOnly` field (nếu cần)

### **Step 3: Update Database Functions** ⏳ TODO
- [ ] Thêm `semi_annual` vào `generatePlanPricing()`
- [ ] Đổi `yearly` → `annual` trong `generatePlanPricing()`
- [ ] Cập nhật discount 15% → 20% cho annual
- [ ] Cập nhật tất cả functions sử dụng pricing

### **Step 4: Update Components** ⏳ TODO
- [ ] Cập nhật `PlanForm.tsx` để dùng `semi_annual` và `annual`
- [ ] Cập nhật tất cả plan display components
- [ ] Update plan comparison components

### **Step 5: Update API Routes** ⏳ TODO
- [ ] Kiểm tra tất cả plan API routes
- [ ] Đảm bảo responses trả về đúng structure
- [ ] Update API tests nếu có

### **Step 6: Search & Replace** ⏳ TODO
- [ ] Tìm và thay `sixMonths` → `semi_annual`
- [ ] Tìm và thay `yearly` → `annual` (trong context pricing)
- [ ] Tìm và thay `pricing.yearly` → `pricing.annual`
- [ ] Tìm và thay `pricing.sixMonths` → `pricing.semi_annual`

### **Step 7: Testing** ⏳ TODO
- [ ] Test plan creation với tất cả billing cycles
- [ ] Test plan display với pricing calculations
- [ ] Test plan update functionality
- [ ] Verify API responses

### **Step 8: Documentation** ⏳ TODO
- [ ] Update Plan interface documentation
- [ ] Update BillingCycle documentation
- [ ] Update pricing calculation documentation

---

## 🔍 **Files Cần Update**

### **High Priority (Core Types & Constants)**
1. `packages/constants/src/subscription.ts` - BILLING_CYCLES constants
2. `packages/types/src/plans/plan.ts` - Plan interface
3. `packages/database/src/plan.ts` - generatePlanPricing()

### **Medium Priority (Components)**
4. `packages/ui/src/components/forms/PlanForm.tsx`
5. `packages/ui/src/components/features/Plans/**` - All plan components

### **Low Priority (Usages)**
6. `apps/admin/app/plans/**` - Admin pages
7. `apps/api/app/api/plans/**` - API routes
8. `packages/database/src/subscription.ts` - Related functions

---

## 📝 **Migration Notes**

### **Breaking Changes**
1. `pricing.yearly` → `pricing.annual` (breaking change)
2. `pricing.sixMonths` → `pricing.semi_annual` (breaking change)
3. `BILLING_CYCLES.YEARLY` → `BILLING_CYCLES.ANNUAL` (breaking change)
4. `'yearly'` → `'annual'` trong BillingCycle type (breaking change)

### **Non-Breaking Changes**
1. Thêm `SEMI_ANNUAL` vào `BILLING_CYCLES` (backward compatible)
2. Thêm `semi_annual` vào pricing structure (backward compatible nếu có default)

### **Recommendation**
- ✅ Thực hiện migration trong 1 PR lớn để tránh inconsistency
- ✅ Cập nhật tất cả files cùng lúc
- ✅ Test kỹ trước khi merge

---

## 🎯 **Expected Outcome**

Sau khi hoàn thành:

1. ✅ **Single Source of Truth**: Plan structure nhất quán trên toàn bộ codebase
2. ✅ **Consistent Naming**: `monthly`, `quarterly`, `semi_annual`, `annual`
3. ✅ **Type Safety**: TypeScript types khớp với implementation
4. ✅ **No Duplication**: Không còn duplicate definitions
5. ✅ **Clear Documentation**: Tất cả naming conventions được document

---

## 📚 **References**

- **Prisma Schema**: `prisma/schema.prisma` (lines 392-413)
- **Plan Types**: `packages/types/src/plans/plan.ts`
- **Constants**: `packages/constants/src/subscription.ts`
- **Database Functions**: `packages/database/src/plan.ts`
- **Plan Form**: `packages/ui/src/components/forms/PlanForm.tsx`

---

**Last Updated:** 2025-01-XX
**Status:** ⏳ Ready for Implementation

