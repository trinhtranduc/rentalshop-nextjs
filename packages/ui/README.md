# @rentalshop/ui Package

This package contains all shared UI components, forms, features, and utilities for the Rental Shop application.

## 📁 Folder Structure

```
packages/ui/src/
├── components/
│   ├── ui/                    # Base UI components (shadcn)
│   │   ├── index.ts          # Export all base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── forms/                 # Pure form components
│   │   ├── index.ts          # Export all form components
│   │   ├── LoginForm.tsx
│   │   ├── CustomerForm.tsx
│   │   └── ...
│   ├── features/              # Business logic components
│   │   ├── Users/
│   │   │   ├── index.ts      # Export main component + types
│   │   │   ├── Users.tsx     # Main component
│   │   │   ├── components/
│   │   │   │   ├── index.ts  # Export all sub-components
│   │   │   │   ├── UserGrid.tsx
│   │   │   │   └── ...
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── ...
│   ├── layout/                # Layout components
│   │   ├── index.ts          # Export all layout components
│   │   └── ...
│   └── charts/                # Chart components
│       ├── index.ts          # Export all chart components
│       └── ...
├── hooks/
│   ├── index.ts              # Export all hooks
│   └── ...
├── lib/
│   ├── index.ts              # Export all utilities
│   └── ...
└── index.tsx                 # Main package exports
```

## 🚀 Export Patterns

### **Base UI Components (`/ui/index.ts`)**
```typescript
// Clean, organized exports for all base components
export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardTitle, CardContent } from './card';
// ... more components
```

### **Forms (`/forms/index.ts`)**
```typescript
// Export all form components
export { default as LoginForm } from './LoginForm';
export { CustomerForm } from './CustomerForm';
export { ProductForm } from './ProductForm';
// ... more forms
```

### **Features (`/features/[FeatureName]/index.ts`)**
```typescript
// Export main component + types + utilities
export { Users } from './Users';
export { default as Users } from './Users';

// Export types
export type { User, UserCreateInput, UserUpdateInput } from './types';

// Export utilities if needed
export { formatUserName, validateUserInput } from './utils';
```

### **Feature Components (`/features/[FeatureName]/components/index.ts`)**
```typescript
// Export all sub-components
export { UserHeader } from './UserHeader';
export { UserFilters } from './UserFilters';
export { UserGrid } from './UserGrid';
// ... more components
```

### **Main Package (`/index.tsx`)**
```typescript
// Use export * from patterns for clean organization
export * from './components/ui';
export * from './components/forms';
export * from './components/features/Dashboard';
export * from './components/features/Products';
// ... more features
export * from './components/layout';
export * from './components/charts';
export * from './hooks';
export * from './lib';
```

## 📦 Usage Examples

### **Import Base Components**
```typescript
import { Button, Card, Input, Select } from '@rentalshop/ui';
```

### **Import Forms**
```typescript
import { LoginForm, CustomerForm, ProductForm } from '@rentalshop/ui';
```

### **Import Features**
```typescript
import { Users, Products, Orders, Dashboard } from '@rentalshop/ui';
```

### **Import Types**
```typescript
import type { User, Product, Order } from '@rentalshop/ui';
```

### **Import Utilities**
```typescript
import { cn, formatDate, formatCurrency } from '@rentalshop/ui';
```

## 🔧 Development Rules

### **1. Always Use Index Files**
- ✅ Use `index.ts` files (not `index.tsx`) for exports
- ✅ Keep component logic in separate `.tsx` files
- ✅ Use `export * from './folder'` in main index for clean organization

### **2. Consistent Export Patterns**
- ✅ Use named exports for most components
- ✅ Use default exports only for main feature components when appropriate
- ✅ Export types from feature index files
- ✅ Export utilities from feature index files

### **3. Folder Organization**
- ✅ Keep component subfolder index files for granular control
- ✅ Use consistent naming conventions across all index files
- ✅ Avoid circular dependencies by maintaining clear hierarchy

### **4. Component Structure**
- ✅ Main feature components in `[FeatureName].tsx`
- ✅ Sub-components in `components/` folder
- ✅ Types in `types.ts`
- ✅ Utilities in `utils.ts`
- ✅ Index file for clean exports

## 🚨 Key Benefits

1. **Cleaner Imports**: `import { Button, Card } from '@rentalshop/ui'`
2. **Better Tree Shaking**: Only import what you need
3. **Easier Maintenance**: Single source of truth for exports
4. **Consistent Structure**: All folders follow the same pattern
5. **No Circular Dependencies**: Clear hierarchy prevents issues
6. **Better Developer Experience**: Clear organization and easy discovery

## 🔄 Migration Notes

When updating this package:

1. **Create missing index files** for any new folders
2. **Use consistent export patterns** across all index files
3. **Update main index.tsx** to use `export * from` patterns
4. **Test imports** in consuming applications
5. **Ensure no circular dependencies** exist

## 📝 Adding New Components

### **For Base UI Components:**
1. Add component to `/ui/` folder
2. Export from `/ui/index.ts`
3. Component automatically available via main package

### **For Forms:**
1. Add form component to `/forms/` folder
2. Export from `/forms/index.ts`
3. Form automatically available via main package

### **For Features:**
1. Create feature folder structure
2. Add main component as `[FeatureName].tsx`
3. Create `index.ts` with proper exports
4. Export from main package index

### **For Utilities:**
1. Add utility to appropriate folder
2. Export from folder's `index.ts`
3. Utility automatically available via main package

This structure ensures clean, maintainable, and scalable component organization while following DRY principles and maintaining consistency across the entire monorepo.
