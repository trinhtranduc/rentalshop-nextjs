# New Simplified Folder Structure

## 🏗️ Complete Project Structure

```
rentalshop-nextjs/
├── 📁 apps/                          # Next.js Applications
│   ├── 📁 api/                       # Backend API Server
│   │   ├── 📁 app/
│   │   │   ├── 📁 api/               # API Routes (Simplified)
│   │   │   │   ├── 📄 auth/          # Authentication endpoints
│   │   │   │   │   ├── login/route.ts
│   │   │   │   │   ├── register/route.ts
│   │   │   │   │   ├── logout/route.ts
│   │   │   │   │   └── reset-password/route.ts
│   │   │   │   ├── 📄 products/      # Product management
│   │   │   │   │   ├── route.ts      # GET/POST /api/products
│   │   │   │   │   ├── search/route.ts
│   │   │   │   │   └── [id]/route.ts # GET/PUT/DELETE /api/products/[id]
│   │   │   │   ├── 📄 orders/        # Order management
│   │   │   │   │   ├── route.ts      # GET/POST /api/orders
│   │   │   │   │   ├── stats/route.ts
│   │   │   │   │   └── [id]/route.ts # GET/PUT/DELETE /api/orders/[id]
│   │   │   │   ├── 📄 customers/     # Customer management
│   │   │   │   │   ├── route.ts      # GET/POST /api/customers
│   │   │   │   │   ├── search/route.ts
│   │   │   │   │   └── [id]/route.ts # GET/PUT/DELETE /api/customers/[id]
│   │   │   │   ├── 📄 users/         # User management
│   │   │   │   │   ├── route.ts      # GET/POST /api/users
│   │   │   │   │   ├── profile/route.ts
│   │   │   │   │   └── [id]/route.ts # GET/PUT/DELETE /api/users/[id]
│   │   │   │   ├── 📄 payments/      # Payment processing
│   │   │   │   │   ├── route.ts      # GET/POST /api/payments
│   │   │   │   │   └── [id]/route.ts # GET/PUT/DELETE /api/payments/[id]
│   │   │   │   ├── 📄 analytics/     # Analytics & reporting
│   │   │   │   │   ├── dashboard/route.ts
│   │   │   │   │   └── reports/route.ts
│   │   │   │   ├── 📄 health/        # Health checks
│   │   │   │   │   └── database/route.ts
│   │   │   │   └── 📄 docs/          # API documentation
│   │   │   │       └── route.ts
│   │   │   ├── 📄 globals.css
│   │   │   ├── 📄 layout.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 lib/                   # API Utilities (Consolidated)
│   │   │   ├── 📄 auth.ts            # Authentication utilities
│   │   │   ├── 📄 database.ts        # Database operations
│   │   │   ├── 📄 jwt.ts             # JWT handling
│   │   │   ├── 📄 middleware.ts      # Middleware functions
│   │   │   ├── 📄 swagger.ts         # API documentation
│   │   │   ├── 📄 utils.ts           # Common utilities
│   │   │   └── 📄 validators.ts      # Input validation
│   │   ├── 📄 middleware.ts          # Next.js middleware
│   │   ├── 📄 next.config.js
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   │
│   ├── 📁 client/                    # Customer-facing App
│   │   ├── 📁 app/
│   │   │   ├── 📁 (auth)/            # Auth pages group
│   │   │   │   ├── 📄 login/page.tsx
│   │   │   │   ├── 📄 register/page.tsx
│   │   │   │   └── 📄 forget-password/page.tsx
│   │   │   ├── 📁 (dashboard)/       # Dashboard pages group
│   │   │   │   ├── 📄 dashboard/page.tsx
│   │   │   │   ├── 📄 products/page.tsx
│   │   │   │   ├── 📄 orders/page.tsx
│   │   │   │   ├── 📄 customers/page.tsx
│   │   │   │   ├── 📄 profile/page.tsx
│   │   │   │   └── 📄 settings/page.tsx
│   │   │   ├── 📄 globals.css
│   │   │   ├── 📄 layout.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 components/            # Client-specific components
│   │   │   ├── 📁 ui/                # Reusable UI components
│   │   │   │   ├── 📄 Button.tsx
│   │   │   │   ├── 📄 Card.tsx
│   │   │   │   ├── 📄 Input.tsx
│   │   │   │   └── 📄 Modal.tsx
│   │   │   ├── 📁 forms/             # Form components
│   │   │   │   ├── 📄 LoginForm.tsx
│   │   │   │   ├── 📄 OrderForm.tsx
│   │   │   │   └── 📄 ProductForm.tsx
│   │   │   ├── 📁 layout/            # Layout components
│   │   │   │   ├── 📄 Header.tsx
│   │   │   │   ├── 📄 Sidebar.tsx
│   │   │   │   └── 📄 Footer.tsx
│   │   │   └── 📁 features/          # Feature-specific components
│   │   │       ├── 📄 ProductCard.tsx
│   │   │       ├── 📄 OrderCard.tsx
│   │   │       └── 📄 CustomerCard.tsx
│   │   ├── 📁 lib/                   # Client utilities
│   │   │   ├── 📄 api.ts             # API client
│   │   │   ├── 📄 auth.ts            # Auth utilities
│   │   │   └── 📄 utils.ts           # Common utilities
│   │   ├── 📁 hooks/                 # Custom hooks
│   │   │   └── 📄 useAuth.ts
│   │   ├── 📄 next.config.js
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   │
│   └── 📁 admin/                     # Admin Dashboard App
│       ├── 📁 app/
│       │   ├── 📁 (auth)/            # Auth pages group
│       │   │   ├── 📄 login/page.tsx
│       │   │   ├── 📄 register/page.tsx
│       │   │   └── 📄 forget-password/page.tsx
│       │   ├── 📁 (dashboard)/       # Admin dashboard pages
│       │   │   ├── 📄 dashboard/page.tsx
│       │   │   ├── 📄 users/page.tsx
│       │   │   ├── 📄 shops/page.tsx
│       │   │   ├── 📄 analytics/page.tsx
│       │   │   └── 📄 settings/page.tsx
│       │   ├── 📄 globals.css
│       │   ├── 📄 layout.tsx
│       │   └── 📄 page.tsx
│       ├── 📁 components/            # Admin-specific components
│       │   ├── 📁 ui/                # Reusable UI components
│       │   ├── 📁 forms/             # Form components
│       │   ├── 📁 layout/            # Layout components
│       │   └── 📁 features/          # Feature-specific components
│       ├── 📁 lib/                   # Admin utilities
│       │   ├── 📄 api.ts
│       │   ├── 📄 auth.ts
│       │   └── 📄 utils.ts
│       ├── 📄 next.config.js
│       ├── 📄 package.json
│       └── 📄 tsconfig.json
│
├── 📁 packages/                      # Shared Packages
│   ├── 📁 ui/                        # Shared UI Components
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📁 ui/            # Base UI components
│   │   │   │   │   ├── 📄 Button.tsx
│   │   │   │   │   ├── 📄 Card.tsx
│   │   │   │   │   ├── 📄 Input.tsx
│   │   │   │   │   ├── 📄 Select.tsx
│   │   │   │   │   ├── 📄 Badge.tsx
│   │   │   │   │   └── 📄 Modal.tsx
│   │   │   │   ├── 📁 forms/         # Form components
│   │   │   │   │   ├── 📄 LoginForm.tsx
│   │   │   │   │   ├── 📄 RegisterForm.tsx
│   │   │   │   │   ├── 📄 OrderForm.tsx
│   │   │   │   │   └── 📄 ProductForm.tsx
│   │   │   │   └── 📁 features/      # Business components
│   │   │   │       ├── 📄 ProductCard.tsx
│   │   │   │       ├── 📄 OrderCard.tsx
│   │   │   │       └── 📄 CustomerCard.tsx
│   │   │   ├── 📁 hooks/             # Shared hooks
│   │   │   │   └── 📄 useThrottledSearch.ts
│   │   │   ├── 📁 utils/             # UI utilities
│   │   │   │   ├── 📄 cn.ts
│   │   │   │   └── 📄 format.ts
│   │   │   └── 📄 index.tsx          # Main export
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   │
│   ├── 📁 database/                  # Database Package
│   │   ├── 📁 src/
│   │   │   ├── 📄 client.ts          # Prisma client
│   │   │   ├── 📄 config.ts          # Database config
│   │   │   ├── 📄 types.ts           # Database types
│   │   │   ├── 📄 utils.ts           # Database utilities
│   │   │   ├── 📄 seed.ts            # Database seeding
│   │   │   ├── 📄 customer.ts        # Customer operations
│   │   │   ├── 📄 product.ts         # Product operations
│   │   │   ├── 📄 order.ts           # Order operations
│   │   │   └── 📄 index.ts           # Main export
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   │
│   ├── 📁 auth/                      # Authentication Package
│   │   ├── 📁 src/
│   │   │   ├── 📄 auth.ts            # Auth utilities
│   │   │   ├── 📄 jwt.ts             # JWT handling
│   │   │   ├── 📄 password.ts        # Password utilities
│   │   │   ├── 📄 types.ts           # Auth types
│   │   │   └── 📄 index.ts           # Main export
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   │
│   └── 📁 utils/                     # Utilities Package
│       ├── 📁 src/
│       │   ├── 📄 common.ts          # Common utilities
│       │   ├── 📄 config.ts          # Config utilities
│       │   ├── 📄 date.ts            # Date utilities
│       │   ├── 📄 errors.ts          # Error handling
│       │   ├── 📄 validation.ts      # Validation utilities
│       │   └── 📄 index.ts           # Main export
│       ├── 📄 package.json
│       └── 📄 tsconfig.json
│
├── 📁 prisma/                        # Database Schema
│   ├── 📄 schema.prisma              # Database schema
│   └── 📁 migrations/                # Database migrations
│
├── 📁 scripts/                       # Development Scripts
│   ├── 📄 setup-database.sh
│   ├── 📄 start-dev.sh
│   └── 📄 add-client.js
│
├── 📄 package.json                   # Root package.json
├── 📄 tsconfig.base.json            # Base TypeScript config
├── 📄 tsup.config.base.ts           # Base build config
├── 📄 turbo.json                     # Turborepo config
└── 📄 README.md
```

## 🔄 Key Changes from Current Structure

### **1. API Routes Simplified**
```typescript
// ❌ Before: Deep nesting
/api/products/[id]/availability/route.ts
/api/products/merchant/[merchantId]/route.ts
/api/products/outlet/[outletId]/route.ts

// ✅ After: Flattened structure
/api/products/route.ts          # GET/POST with query params
/api/products/[id]/route.ts     # GET/PUT/DELETE specific product
/api/products/search/route.ts   # Search functionality
```

### **2. Component Organization**
```typescript
// ❌ Before: Scattered components
components/auth/LoginForm.tsx
components/products/ProductCard.tsx
components/orders/OrderCard.tsx

// ✅ After: Organized by purpose
components/ui/Button.tsx        # Base UI components
components/forms/LoginForm.tsx  # Form components
components/features/ProductCard.tsx # Business components
```

### **3. Shared Packages Structure**
```typescript
// ✅ Clear separation of concerns
@rentalshop/ui        # UI components & utilities
@rentalshop/database  # Database operations & types
@rentalshop/auth      # Authentication logic
@rentalshop/utils     # Common utilities
```

### **4. Route Grouping**
```typescript
// ✅ Next.js 13+ route groups for better organization
app/
├── (auth)/           # Authentication pages
├── (dashboard)/      # Dashboard pages
└── (public)/         # Public pages
```

## 📦 Package Dependencies

### **Root package.json**
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  }
}
```

### **App Dependencies**
```json
// apps/client/package.json
{
  "dependencies": {
    "@rentalshop/ui": "workspace:*",
    "@rentalshop/auth": "workspace:*",
    "@rentalshop/utils": "workspace:*"
  }
}

// apps/admin/package.json
{
  "dependencies": {
    "@rentalshop/ui": "workspace:*",
    "@rentalshop/auth": "workspace:*",
    "@rentalshop/utils": "workspace:*"
  }
}

// apps/api/package.json
{
  "dependencies": {
    "@rentalshop/database": "workspace:*",
    "@rentalshop/auth": "workspace:*",
    "@rentalshop/utils": "workspace:*"
  }
}
```

## 🎯 Benefits of New Structure

1. **Reduced Complexity** - Fewer nested directories
2. **Better Maintainability** - Clear separation of concerns
3. **Improved Reusability** - Shared packages for common functionality
4. **Consistent Patterns** - Similar structure across all apps
5. **Easier Navigation** - Logical grouping of related files
6. **Better Performance** - Optimized imports and builds
7. **Scalable Architecture** - Easy to add new features and apps

## 🚀 Migration Steps

1. **Phase 1**: Consolidate API routes
2. **Phase 2**: Reorganize components
3. **Phase 3**: Update imports and dependencies
4. **Phase 4**: Test and validate functionality

This structure provides a clean, maintainable, and scalable foundation for your rental shop application while following DRY principles and best practices. 