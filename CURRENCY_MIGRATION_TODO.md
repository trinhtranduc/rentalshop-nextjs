# Currency Migration TODO List

## 📊 Tổng quan

Tìm thấy **48 files** đang sử dụng `formatCurrency()` cần migrate sang `useFormatCurrency()` hook.

## 🎯 Ưu tiên cao (Order & Product Display)

### ✅ Đã hoàn thành:
- [x] `packages/ui/src/components/forms/CreateOrderForm/components/OrderSummarySection.tsx`
- [x] `packages/ui/src/components/forms/CreateOrderForm/components/ProductsSection.tsx`
- [x] `apps/client/app/orders/create/page.tsx` - Wrapped with CurrencyProvider
- [x] `apps/client/app/orders/[id]/edit/page.tsx` - Wrapped with CurrencyProvider

### 🔴 Cần update ngay:

#### Order Components (Priority 1)
1. **`packages/ui/src/components/features/OrderDetail/OrderDetail.tsx`**
   - [ ] Import `useFormatCurrency` thay vì `formatCurrency`
   - [ ] Fix: Line 40 - `import { formatCurrency } from '@rentalshop/ui'` → Should be from `@rentalshop/utils` hoặc dùng hook
   - [ ] Line 708: `formatCurrency(item.unitPrice)` → `formatMoney(item.unitPrice)`
   - [ ] Line 739, 750, 758, 765, 779, 939, 948: Tất cả dùng `formatMoney()`
   - **8 instances cần fix**

2. **`packages/ui/src/components/features/OrderDetail/components/OrderItems.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

3. **`packages/ui/src/components/features/OrderDetail/components/OrderSummary.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

4. **`packages/ui/src/components/features/OrderDetail/components/CollectionReturnModal.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

5. **`packages/ui/src/components/features/Orders/components/OrderTable.tsx`**
   - [ ] Line 235: `formatCurrency(order.totalAmount)` → `formatMoney(order.totalAmount)`
   - [ ] Line 238: `formatCurrency(order.depositAmount)` → `formatMoney(order.depositAmount)`
   - **2 instances cần fix**

6. **`packages/ui/src/components/features/Orders/components/OrderHeader.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

7. **`packages/ui/src/components/features/Orders/components/OrderStats.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

8. **`packages/ui/src/components/forms/CreateOrderForm/components/OrderPreviewForm.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

9. **`packages/ui/src/components/forms/OrderForm.tsx`**
   - [ ] Add `useFormatCurrency()` hook
   - [ ] Update all formatCurrency calls

#### Product Components (Priority 2)
10. **`packages/ui/src/components/features/Products/components/ProductTable.tsx`**
    - [ ] Line 206: `formatCurrency(product.rentPrice || 0)` → `formatMoney(product.rentPrice || 0)`
    - [ ] Line 210: `formatCurrency(product.salePrice)` → `formatMoney(product.salePrice)`
    - **2 instances cần fix**

11. **`packages/ui/src/components/features/Products/components/ProductDetailList.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

12. **`packages/ui/src/components/features/Products/components/ProductOrdersView.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

13. **`packages/ui/src/components/features/Products/components/ProductOrdersDialog.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

#### Customer Components (Priority 2)
14. **`packages/ui/src/components/features/Customers/components/CustomerHeader.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

15. **`packages/ui/src/components/features/Customers/components/CustomerStats.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

16. **`packages/ui/src/components/features/Customers/components/CustomerOrdersDialog.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

17. **`packages/ui/src/components/features/Customers/components/CustomerOrdersSummaryCard.tsx`**
    - [ ] Add `useFormatCurrency()` hook
    - [ ] Update all formatCurrency calls

## 🟡 Ưu tiên thấp (Subscription & Payment)

Các component này thường có currency riêng (từ subscription/payment data):

18. **`packages/ui/src/components/features/Payments/components/PaymentTable.tsx`**
    - [ ] Review: Payment có currency field riêng
    - [ ] Quyết định: Dùng payment.currency hoặc merchant currency?

19. **`packages/ui/src/components/features/Payments/components/PaymentDetailDialog.tsx`**
    - [ ] Review: Payment có currency field riêng
    - [ ] Quyết định: Dùng payment.currency hoặc merchant currency?

20-37. **Subscription Components** (18 files):
    - [ ] `SubscriptionViewDialog.tsx`
    - [ ] `SubscriptionList.tsx`
    - [ ] `SubscriptionPreviewPage.tsx`
    - [ ] `ManualRenewalModal.tsx`
    - [ ] `SubscriptionExtendDialog.tsx`
    - [ ] `SubscriptionEditDialog.tsx`
    - [ ] `SubscriptionChangePlanDialog.tsx`
    - [ ] `SubscriptionCancelDialog.tsx`
    - [ ] `AdminExtensionModal.tsx`
    - [ ] `SubscriptionActivityTimeline.tsx`
    - [ ] `SubscriptionFormSimple.tsx`
    - [ ] `SubscriptionForm.tsx`
    - [ ] `UpgradeTrialModal.tsx`
    - [ ] `PaymentHistoryTable.tsx`
    - Review: Subscription có currency field
    - Quyết định: Dùng subscription.currency hoặc merchant currency?

38-42. **Plan Components** (5 files):
    - [ ] `PlanTable.tsx`
    - [ ] `PlanDetailModal.tsx`
    - [ ] `PlanSelection.tsx`
    - [ ] `PlanCard.tsx`
    - [ ] `PlanForm.tsx`
    - Review: Plan có currency field
    - Quyết định: Dùng plan.currency hoặc merchant currency?

## 📄 Pages cần wrap với CurrencyProvider

43. **`apps/client/app/subscription/page.tsx`**
    - [ ] Wrap với `<CurrencyProvider>`

44. **`apps/client/app/plans/page.tsx`**
    - [ ] Wrap với `<CurrencyProvider>`

45. **`apps/admin/app/subscriptions/[id]/page.tsx`**
    - [ ] Wrap với `<CurrencyProvider>`

46. **`apps/admin/app/merchants/[id]/products/[productId]/orders/page.tsx`**
    - [ ] Wrap với `<CurrencyProvider>`

## 🔧 Pattern để áp dụng

### Cách 1: useFormatCurrency Hook (Recommended)

```typescript
// ❌ OLD
import { formatCurrency } from '@rentalshop/utils';

function Component({ amount }) {
  return <div>{formatCurrency(amount)}</div>;
}

// ✅ NEW
import { useFormatCurrency } from '@rentalshop/ui';

function Component({ amount }) {
  const formatMoney = useFormatCurrency();
  return <div>{formatMoney(amount)}</div>;
}
```

### Cách 2: Money Component (Simple Display)

```typescript
// ❌ OLD
import { formatCurrency } from '@rentalshop/utils';
<div>{formatCurrency(amount)}</div>

// ✅ NEW
import { Money } from '@rentalshop/ui';
<div><Money amount={amount} inline /></div>
```

### Cách 3: Wrap Page với CurrencyProvider

```typescript
// ❌ OLD
export default function OrdersPage() {
  return <OrderList />;
}

// ✅ NEW
import { CurrencyProvider } from '@rentalshop/ui';

export default function OrdersPage() {
  const { user } = useAuth();
  const merchantCurrency = user?.merchant?.currency || 'USD';
  
  return (
    <CurrencyProvider merchantCurrency={merchantCurrency}>
      <OrderList />
    </CurrencyProvider>
  );
}
```

## 📝 Checklist cho mỗi file

Khi update một file:
- [ ] Add import: `import { useFormatCurrency } from '@rentalshop/ui';`
- [ ] Add hook: `const formatMoney = useFormatCurrency();`
- [ ] Replace tất cả `formatCurrency(amount)` → `formatMoney(amount)`
- [ ] Remove import cũ: `import { formatCurrency } from '@rentalshop/utils';`
- [ ] Test với USD merchant
- [ ] Test với VND merchant
- [ ] Rebuild UI package: `yarn workspace @rentalshop/ui build`

## 🎯 Milestone

### Phase 1: Critical Order Flow (Week 1)
- [ ] OrderDetail và components con (4 files)
- [ ] OrderTable, OrderHeader, OrderStats (3 files)
- [ ] OrderForm, OrderPreviewForm (2 files)
- **Total: 9 files**

### Phase 2: Product & Customer (Week 2)
- [ ] Product components (4 files)
- [ ] Customer components (4 files)
- **Total: 8 files**

### Phase 3: Payment & Subscription (Week 3)
- [ ] Payment components (2 files)
- [ ] Subscription components (18 files)
- [ ] Plan components (5 files)
- **Total: 25 files**

### Phase 4: Pages & Integration (Week 4)
- [ ] Wrap all pages với CurrencyProvider (4 pages)
- [ ] End-to-end testing
- [ ] Documentation update

## 🧪 Testing Strategy

Sau khi update mỗi component:
1. Test rendering với USD
2. Test rendering với VND
3. Test calculations (quantity × price)
4. Test edge cases (null, undefined, 0)
5. Visual check currency symbol position
6. Check số thập phân (USD: 2 decimals, VND: 0 decimals)

## 📊 Progress Tracker

- **Completed**: 4/48 files (8%)
- **In Progress**: 0/48 files  
- **Remaining**: 44/48 files (92%)

---

**Last Updated**: 2025-01-14
**Priority**: High
**Estimated Effort**: 4 weeks

