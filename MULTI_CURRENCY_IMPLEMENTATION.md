# Multi-Currency Support Implementation Summary

## ✅ Completed Tasks

### 1. Database Schema ✅
- **File**: `prisma/schema.prisma`
- **Changes**: Added `currency String @default("USD")` field to Merchant model (line 53)
- **Migration**: Created migration script to set existing merchants to USD

### 2. Type Definitions ✅
- **File**: `packages/types/src/entities/merchant.ts`
- **Changes**:
  - Added `currency: string` to `Merchant` interface
  - Added `currency?: string` to `MerchantCreateInput`
  - Added `currency?: string` to `MerchantUpdateInput`

### 3. Database Operations ✅
- **File**: `packages/database/src/merchant.ts`
- **Changes**:
  - Added `currency?: string` to `MerchantCreateData` interface
  - `MerchantUpdateData` automatically includes currency via extension

### 4. Registration API ✅
- **File**: `apps/api/app/api/merchants/register/route.ts`
- **Changes**:
  - Added `currency: z.enum(['USD', 'VND']).default('USD')` to validation schema
  - Pass currency when creating merchant
  - Use merchant's currency for subscription creation

### 5. Registration UI ✅
- **File**: `packages/ui/src/components/forms/MerchantRegistrationForm.tsx`
- **Changes**:
  - Added currency selector with USD and VND options
  - Default value: USD
  - Uses `getCurrencyDisplay` from `@rentalshop/utils`
  - Added currency to form data interface

- **File**: `apps/client/app/register-merchant/page.tsx`
- **Changes**: Added `currency: 'USD' | 'VND'` to `MerchantRegistrationData` interface

### 6. Currency Context ✅
- **File**: `packages/ui/src/contexts/CurrencyContext.tsx` (NEW)
- **Features**:
  - `CurrencyProvider` component for app-wide currency management
  - `useCurrency()` hook to access currency in any component
  - `withCurrency()` HOC for injecting currency props
  - Automatically uses merchant's currency when provided

- **File**: `packages/ui/src/index.tsx`
- **Changes**: Added export for CurrencyContext

### 7. Currency Constants ✅
- **File**: `packages/constants/src/currency.ts` (NEW)
- **Exports**:
  - `SUPPORTED_CURRENCIES: ['USD', 'VND']`
  - `DEFAULT_CURRENCY: 'USD'`
  - `CURRENCY_SYMBOLS: { USD: '$', VND: 'đ' }`
  - `CURRENCY_NAMES: { USD: 'US Dollar', VND: 'Vietnamese Dong' }`
  - `CURRENCY_LOCALES`, `CURRENCY_DECIMALS`, `CURRENCY_SYMBOL_POSITION`
  - `CURRENCY_CONFIGS` with complete configuration
  - Helper functions: `getCurrencyConfig`, `isValidCurrency`, etc.

- **File**: `packages/constants/src/index.ts`
- **Changes**: Added `export * from './currency'`

### 8. Migration Script ✅
- **File**: `scripts/migrate-merchant-currency.js` (NEW)
- **Features**:
  - Sets currency to USD for all merchants without currency
  - Updates related subscriptions to match merchant currency
  - Comprehensive verification and reporting
  - Run with: `node scripts/migrate-merchant-currency.js`

### 9. Order Form Updates ✅ (Partial)
- **File**: `packages/ui/src/components/forms/CreateOrderForm/types.ts`
- **Changes**: Added `currency?: 'USD' | 'VND'` to `CreateOrderFormProps`

- **File**: `packages/ui/src/components/forms/CreateOrderForm/CreateOrderForm.tsx`
- **Changes**:
  - Extract currency prop with default 'USD'
  - Pass currency to ProductsSection
  - Pass currency to OrderInfoSection
  - Pass currency to OrderSummarySection

- **File**: `packages/ui/src/components/forms/CreateOrderForm/components/OrderSummarySection.tsx`
- **Changes**:
  - Added `currency?: 'USD' | 'VND'` to props
  - Updated all 4 `formatCurrency` calls to use currency prop
  - Default value: USD

## 🔄 In Progress / Remaining Tasks

### 10. Update ProductsSection Component
- **File**: `packages/ui/src/components/forms/CreateOrderForm/components/ProductsSection.tsx`
- **TODO**:
  - Add `currency` prop to interface
  - Update formatCurrency calls to use currency prop
  - Estimated formatCurrency calls: ~5-10

### 11. Update OrderInfoSection Component
- **File**: `packages/ui/src/components/forms/CreateOrderForm/components/OrderInfoSection.tsx`
- **TODO**:
  - Add `currency` prop to interface
  - Update formatCurrency calls to use currency prop (if any)

### 12. Update Order Creation Pages
- **File**: `apps/client/app/orders/create/page.tsx`
- **TODO**:
  - Get merchant data (with currency)
  - Pass `currency={merchant.currency}` to CreateOrderForm

- **File**: `apps/client/app/orders/[id]/edit/page.tsx`
- **TODO**:
  - Get merchant data (with currency)
  - Pass `currency={merchant.currency}` to CreateOrderForm

### 13. Update Other Order Components (~50 files)
Files that need currency updates (found via grep):

**Order Display Components:**
- `packages/ui/src/components/features/Orders/components/OrderTable.tsx`
- `packages/ui/src/components/features/Orders/components/OrderHeader.tsx`
- `packages/ui/src/components/features/Orders/components/OrderStats.tsx`
- `packages/ui/src/components/features/OrderDetail/OrderDetail.tsx`
- `packages/ui/src/components/features/OrderDetail/components/OrderItems.tsx`
- `packages/ui/src/components/features/OrderDetail/components/OrderSummary.tsx`
- `packages/ui/src/components/features/OrderDetail/components/CollectionReturnModal.tsx`
- `packages/ui/src/components/features/Orders/RentalPeriodSelector.tsx`

**Product Components:**
- `packages/ui/src/components/features/Products/components/ProductTable.tsx`
- `packages/ui/src/components/features/Products/components/ProductOrdersView.tsx`
- `packages/ui/src/components/features/Products/components/ProductOrdersDialog.tsx`
- `packages/ui/src/components/features/Products/components/ProductDetailList.tsx`
- `packages/ui/src/components/forms/ProductForm.tsx`

**Customer Components:**
- `packages/ui/src/components/features/Customers/components/CustomerHeader.tsx`
- `packages/ui/src/components/features/Customers/components/CustomerOrdersDialog.tsx`
- `packages/ui/src/components/features/Customers/components/CustomerOrdersSummaryCard.tsx`
- `packages/ui/src/components/features/Customers/components/CustomerStats.tsx`

**Payment Components:**
- `packages/ui/src/components/features/Payments/components/PaymentTable.tsx`
- `packages/ui/src/components/features/Payments/components/PaymentDetailDialog.tsx`

**Subscription Components:**
- `packages/ui/src/components/features/Subscriptions/components/*` (multiple files)

**Dashboard Components:**
- `apps/client/app/page.tsx`
- `apps/client/app/plans/page.tsx`
- `apps/client/app/subscription/page.tsx`

### 14. Migration Execution
- **TODO**: Run migration script after testing
  ```bash
  node scripts/migrate-merchant-currency.js
  ```

### 15. Testing
- [ ] Test new merchant registration with USD
- [ ] Test new merchant registration with VND
- [ ] Test order creation with USD currency
- [ ] Test order creation with VND currency
- [ ] Test formatCurrency displays correct symbol and format
- [ ] Test existing merchants default to USD
- [ ] Test all updated components render correctly
- [ ] Test subscription currency matches merchant currency

## 📝 Implementation Strategy

### Approach for Remaining Components

For each component that uses `formatCurrency`:

1. **Add currency prop to component interface:**
   ```typescript
   interface MyComponentProps {
     // ... existing props ...
     currency?: 'USD' | 'VND';
   }
   ```

2. **Extract currency prop with default:**
   ```typescript
   const MyComponent: React.FC<MyComponentProps> = ({
     // ... existing props ...
     currency = 'USD',
   }) => {
   ```

3. **Update formatCurrency calls:**
   ```typescript
   // Before:
   formatCurrency(amount)
   
   // After:
   formatCurrency(amount, currency)
   ```

4. **Pass currency from parent components:**
   - Get merchant data with currency field
   - Pass `currency={merchant.currency}` to child components

### Using Currency Context (Alternative Approach)

For components deeply nested or used in multiple places:

```typescript
import { useCurrency } from '@rentalshop/ui';

function MyComponent() {
  const { currency, symbol } = useCurrency();
  
  return <div>{formatCurrency(100, currency)}</div>;
}

// Wrap app with CurrencyProvider:
<CurrencyProvider merchantCurrency={merchant.currency}>
  <App />
</CurrencyProvider>
```

## 🔧 Build Commands

After making changes to shared packages:

```bash
# Build individual packages
yarn workspace @rentalshop/constants build
yarn workspace @rentalshop/types build
yarn workspace @rentalshop/database build
yarn workspace @rentalshop/ui build

# Build all packages
yarn build

# Run migration
node scripts/migrate-merchant-currency.js
```

## 🎯 Key Decision Points

- ✅ Currency at merchant level (not outlet or per-transaction)
- ✅ No currency conversion needed between merchants
- ✅ Default currency: USD for new and existing merchants
- ✅ No mixed currencies in single order
- ⚠️ Merchants cannot change currency after creation (prevents data inconsistency)

## 📚 Documentation

### For Developers

When creating new components that display prices:

1. Always accept `currency` as an optional prop (defaults to 'USD')
2. Pass currency to all `formatCurrency` calls
3. If using merchant data, pass `merchant.currency` to components
4. Consider using `useCurrency()` hook for deeply nested components

### For Users

- Select your currency during merchant registration
- All prices and transactions will be in your selected currency
- Currency cannot be changed after registration (contact support if needed)

## 🐛 Known Issues / Limitations

1. **Database Migration**: Prisma migrate requires active database connection
   - Workaround: Run migration manually after database is available
   
2. **Build Order**: Constants package must be built before UI package
   - Solution: Build packages in correct order (constants → types → database → ui)

3. **Type Imports**: Currency types defined in both `@rentalshop/types` and `@rentalshop/constants`
   - Reason: Avoid circular dependencies in build process
   - Both export the same `CurrencyCode` type

## 📊 Progress Tracker

- [x] Database schema changes (1/1)
- [x] Type definitions (3/3)
- [x] Database operations (1/1)
- [x] Registration API (1/1)
- [x] Registration UI (2/2)
- [x] Currency context (2/2)
- [x] Currency constants (2/2)
- [x] Migration script (1/1)
- [x] Order form infrastructure (2/2)
- [x] OrderSummarySection (1/1)
- [ ] ProductsSection (0/1)
- [ ] OrderInfoSection (0/1)
- [ ] Order creation pages (0/2)
- [ ] Other order components (0/~50)
- [ ] Testing (0/8)

**Overall Progress: ~30% Complete**

**Core Infrastructure: 100% Complete** ✅
**Component Updates: 20% Complete** 🔄
**Testing: 0% Complete** ⏳

## 🚀 Next Steps

1. Update ProductsSection and OrderInfoSection components
2. Update order creation and edit pages to pass merchant currency
3. Create helper script to bulk update remaining formatCurrency calls
4. Test all components with both USD and VND
5. Run migration script in development
6. Document currency usage in README
7. Create PR with all changes

## 💡 Tips for Completion

- Use find & replace with regex to batch update similar components
- Test with both currencies after each major component update
- Consider creating a `CurrencyDisplay` wrapper component for consistent formatting
- Add currency to API response types where prices are returned
- Update Storybook stories to show both currency variants (if applicable)

