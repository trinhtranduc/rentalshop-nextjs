# @rentalshop/constants

Centralized constants package for the Rental Shop monorepo. This package provides all constants used across the application to ensure consistency and maintainability.

## 🎯 Purpose

- **Single Source of Truth**: All constants in one place
- **Easy Maintenance**: Change once, affects everywhere
- **Consistent Values**: Same limits across all components
- **Performance**: No duplicate values in bundles
- **Better Testing**: Centralized constants are easier to mock

## 📦 Installation

```bash
# From the root of the monorepo
yarn add @rentalshop/constants

# Or if you're in a package
yarn add @rentalshop/constants@workspace:*
```

## 🚀 Usage

### Basic Import

```typescript
import { PAGINATION, SEARCH, VALIDATION, UI, BUSINESS, ENVIRONMENT } from '@rentalshop/constants';

// Use constants directly
const searchLimit = PAGINATION.SEARCH_LIMIT;        // 20
const debounceMs = SEARCH.DEBOUNCE_MS;             // 300
const lowStockThreshold = VALIDATION.LOW_STOCK_THRESHOLD; // 2
```

### Convenience Import

```typescript
import CONSTANTS from '@rentalshop/constants';

// Access all constants through the main object
const searchLimit = CONSTANTS.PAGINATION.SEARCH_LIMIT;
const businessHours = CONSTANTS.BUSINESS.BUSINESS_HOURS.OPEN;
```

## 📚 Available Constants

### 🔢 PAGINATION
Constants for pagination and list operations:

```typescript
PAGINATION.SEARCH_LIMIT        // 20 - Default search results limit
PAGINATION.DEFAULT_PAGE_SIZE   // 25 - Default page size
PAGINATION.MAX_PAGE_SIZE       // 100 - Maximum page size
PAGINATION.DASHBOARD_ITEMS     // 10 - Items shown on dashboard
PAGINATION.RECENT_ORDERS       // 5 - Recent orders to display
PAGINATION.TOP_PRODUCTS        // 8 - Top products to show
PAGINATION.TOP_CUSTOMERS       // 6 - Top customers to show
```

### 🔍 SEARCH
Constants for search behavior and query limits:

```typescript
SEARCH.DEBOUNCE_MS             // 300 - Search debounce delay
SEARCH.MIN_QUERY_LENGTH        // 2 - Minimum characters to search
SEARCH.MAX_QUERY_LENGTH        // 100 - Maximum query length
SEARCH.SUGGESTION_LIMIT        // 5 - Search suggestions limit
SEARCH.AUTOCOMPLETE_DELAY      // 200 - Autocomplete delay
```

### ✅ VALIDATION
Constants for validation rules and business logic:

```typescript
VALIDATION.MIN_RENTAL_DAYS     // 1 - Minimum rental period
VALIDATION.MAX_RENTAL_DAYS     // 365 - Maximum rental period
VALIDATION.LOW_STOCK_THRESHOLD // 2 - Low stock warning threshold
VALIDATION.MIN_PASSWORD_LENGTH // 8 - Minimum password length
VALIDATION.MAX_ORDER_AMOUNT    // 999999.99 - Maximum order value
```

### 🎨 UI
Constants for UI behavior and user experience:

```typescript
UI.ANIMATION_DURATION          // 200 - Animation duration in ms
UI.TOAST_DURATION             // 5000 - Toast notification duration
UI.LOADING_DELAY              // 1000 - Loading state delay
UI.BREAKPOINTS.MOBILE         // 768 - Mobile breakpoint
UI.Z_INDEX.MODAL              // 2000 - Modal z-index
```

### 🏢 BUSINESS
Constants for business operations and rules:

```typescript
BUSINESS.DEFAULT_QUANTITY      // 1 - Default order quantity
BUSINESS.MIN_RENTAL_DAYS       // 1 - Minimum rental period
BUSINESS.MAX_RENTAL_DAYS       // 365 - Maximum rental period
BUSINESS.DEFAULT_PICKUP_TIME   // "09:00" - Default pickup time
BUSINESS.LOW_STOCK_WARNING     // 5 - Low stock warning level
BUSINESS.CUSTOMER_CREDIT_LIMIT // 1000 - Customer credit limit
```

### 🌍 ENVIRONMENT
Constants that vary by environment:

```typescript
ENVIRONMENT.API_TIMEOUT        // 10000 (prod) / 30000 (dev)
ENVIRONMENT.SEARCH_LIMIT       // 50 (prod) / 20 (dev)
ENVIRONMENT.LOG_LEVEL          // "error" (prod) / "debug" (dev)
ENVIRONMENT.ENABLE_DEBUG_MODE  // false (prod) / true (dev)
```

## 🔧 Adding New Constants

### 1. Create a new constants file

```typescript
// packages/constants/src/new-feature.ts
export const NEW_FEATURE = {
  FEATURE_FLAG: true,
  MAX_ITEMS: 100,
  TIMEOUT: 5000,
} as const;

export type NewFeatureValue = typeof NEW_FEATURE[keyof typeof NEW_FEATURE];
```

### 2. Export from the main index

```typescript
// packages/constants/src/index.ts
import { NEW_FEATURE } from './new-feature';

export * from './new-feature';

export const CONSTANTS = {
  // ... existing constants
  NEW_FEATURE,
} as const;
```

### 3. Rebuild the package

```bash
cd packages/constants
yarn build
```

## 📝 Best Practices

### ✅ DO
- Use constants for all magic numbers and strings
- Group related constants together
- Use descriptive names
- Export types for TypeScript support
- Use `as const` for type safety

### ❌ DON'T
- Hardcode values in components
- Duplicate constants across packages
- Use unclear or abbreviated names
- Forget to export types
- Use mutable constants

## 🧪 Testing

Constants are easy to test and mock:

```typescript
// In your tests
import { PAGINATION } from '@rentalshop/constants';

describe('Pagination', () => {
  it('should have reasonable limits', () => {
    expect(PAGINATION.SEARCH_LIMIT).toBeGreaterThan(0);
    expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(PAGINATION.DEFAULT_PAGE_SIZE);
  });
});
```

## 🔄 Migration Guide

### Before (❌ Hardcoded)
```typescript
const SEARCH_LIMIT = 20;
const LOW_STOCK_THRESHOLD = 2;
const DEFAULT_QUANTITY = 1;
```

### After (✅ Centralized)
```typescript
import { PAGINATION, VALIDATION, BUSINESS } from '@rentalshop/constants';

PAGINATION.SEARCH_LIMIT
VALIDATION.LOW_STOCK_THRESHOLD
BUSINESS.DEFAULT_QUANTITY
```

## 📊 Performance Impact

- **Bundle Size**: Minimal impact (constants are tree-shakeable)
- **Runtime**: No performance impact (constants are inlined)
- **Maintenance**: Significant improvement in maintainability

## 🤝 Contributing

When adding new constants:

1. **Follow Naming Convention**: Use UPPER_SNAKE_CASE
2. **Group Logically**: Put related constants together
3. **Add Types**: Export TypeScript types for all constants
4. **Document**: Add JSDoc comments for complex constants
5. **Test**: Ensure constants work in all environments

## 📚 Related Packages

- `@rentalshop/ui` - UI components using these constants
- `@rentalshop/utils` - Utility functions using these constants
- `@rentalshop/types` - Type definitions for the constants

## 🎉 Benefits

- **🎯 Consistency**: Same values across all components
- **🔧 Maintainability**: Change once, affects everywhere
- **📱 Scalability**: Easy to add new constants
- **🧪 Testability**: Centralized constants are easier to test
- **🚀 Performance**: No duplicate values in bundles
- **📚 Documentation**: Single place to document all constants

---

**Happy coding! 🚀**
