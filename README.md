# 🏪 Rental Shop Next.js Monorepo

A modern, consolidated monorepo for rental shop management with shared packages and role-based access control.

## 🚀 **QUICK START**

### **Prerequisites**
- Node.js 18+ 
- Yarn 1.22+
- PostgreSQL database
- Git

### **1. Clone & Install**
```bash
# Clone the repository
git clone <your-repo-url>
cd rentalshop-nextjs

# Install dependencies
yarn install
```

### **2. Environment Setup**
```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your database and API keys
DATABASE_URL="postgresql://username:password@localhost:5432/rentalshop"
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### **3. Database Setup**
```bash
# Run database migrations
yarn db:migrate

# Seed the database (optional)
yarn db:seed
```

### **4. Build Packages**
```bash
# Build all shared packages
yarn build:packages

# Or build individual packages
cd packages/types && yarn build
cd packages/ui && yarn build
cd packages/auth && yarn build
cd packages/database && yarn build
cd packages/utils && yarn build
cd packages/hooks && yarn build
```

### **5. Start Development**
```bash
# Start all applications (recommended)
yarn dev:all

# Alternative: Start all applications using turbo
yarn dev

# Or start specific apps individually
yarn dev:client    # Client app (port 3000)
yarn dev:admin     # Admin app (port 3001) 
yarn dev:api       # API server (port 3002)
```

**Note**: `yarn dev:all` and `yarn dev` both run all applications simultaneously using Turbo. Use `yarn dev:client`, `yarn dev:admin`, or `yarn dev:api` to run only specific applications.

## 🏗️ **MONOREPO ARCHITECTURE**

```
rentalshop-nextjs/
├── 📦 packages/                           # Shared packages for all platforms
│   ├── 🎨 ui/                            # UI component library
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/                   # Shared UI primitives (buttons, cards, inputs)
│   │       │   ├── features/             # Business logic components
│   │       │   │   ├── Products/         # Product management
│   │       │   │   ├── Orders/           # Order management
│   │       │   │   ├── Customers/        # Customer management
│   │       │   │   ├── Users/            # User management
│   │       │   │   ├── Dashboard/        # Analytics & reporting
│   │       │   │   ├── Calendars/        # Scheduling & availability
│   │       │   │   ├── Settings/         # Configuration
│   │       │   │   └── Shops/            # Shop management
│   │       │   ├── forms/                # Pure form components
│   │       │   │   ├── LoginForm.tsx
│   │       │   │   ├── RegisterForm.tsx
│   │       │   │   ├── CustomerForm.tsx
│   │       │   │   ├── ProductForm.tsx
│   │       │   │   ├── OrderForm.tsx
│   │       │   │   ├── CreateOrderForm.tsx
│   │       │   │   └── ForgetPasswordForm.tsx
│   │       │   └── layout/               # Layout components
│   │       ├── hooks/                   # UI-specific hooks
│   │       ├── lib/                     # UI utilities
│   │       └── index.tsx                # Main package exports
│   │
│   ├── 🔐 auth/                          # Complete authentication system
│   │   └── src/
│   │       ├── auth.ts                   # Core auth logic
│   │       ├── client/                    # Client-specific auth
│   │       │   └── index.ts              # ✅ COMPLETED
│   │       ├── admin/                     # Admin-specific auth
│   │       │   └── index.ts              # ✅ COMPLETED
│   │       ├── browser.ts                 # Browser auth
│   │       ├── jwt.ts                     # JWT handling
│   │       ├── password.ts                # Password utilities
│   │       ├── authorization.ts           # Role-based access control
│   │       └── types.ts                   # Auth types
│   │
│   ├── 🗄️ database/                      # Database layer
│   │   └── src/
│   │       ├── client.ts                  # Prisma client
│   │       ├── models/                    # Database operations
│   │       ├── seed.ts                    # Database seeding
│   │       └── types.ts                   # Database types
│   │
│   ├── 🎣 hooks/                          # React hooks & business logic
│   │   └── src/
│   │       ├── hooks/                     # Business logic hooks
│   │       │   ├── useAuth.ts             # Authentication hook ✅
│   │       │   ├── useProductAvailability.ts # Product availability hook ✅
│   │       │   ├── useThrottledSearch.ts  # Debounced search hook ✅
│   │       │   └── index.ts               # Hooks exports
│   │       └── index.ts                   # Package exports
│   │
│   ├── 🛠️ utils/                          # Utilities and API layer
│   │   └── src/
│   │       ├── api/                       # ✅ COMPLETE API client
│   │       │   ├── products.ts            # Product API
│   │       │   ├── customers.ts           # Customer API
│   │       │   ├── orders.ts              # Order API
│   │       │   ├── outlets.ts             # Outlet API
│   │       │   ├── analytics.ts           # Analytics API
│   │       │   ├── categories.ts          # Category API
│   │       │   ├── notifications.ts       # Notification API
│   │       │   ├── profile.ts             # Profile API
│   │       │   ├── shops.ts               # Shop API
│   │       │   ├── users.ts               # User API
│   │       │   └── index.ts               # API exports
│   │       ├── config/                    # ✅ COMPLETE Configuration
│   │       │   ├── index.ts               # Main config exports
│   │       │   ├── main.ts                # Main configuration
│   │       │   ├── api.ts                 # API configuration
│   │       │   ├── database.ts            # Database configuration
│   │       │   └── environment.ts         # Environment configuration
│   │       ├── validation.ts              # Validation schemas
│   │       ├── errors.ts                  # Error handling
│   │       ├── common.ts                  # Common utilities
│   │       ├── publicId.ts                # Public ID utilities
│   │       ├── date.ts                    # Date utilities
│   │       └── index.ts                   # Package exports
│   │
│   └── 📝 types/                          # Type system (✅ COMPLETED)
│       └── src/
│           ├── auth/                       # Authentication types
│           ├── users/                      # User types
│           ├── products/                   # Product types
│           ├── orders/                     # Order types
│           ├── customers/                  # Customer types
│           ├── merchants/                  # Merchant types
│           ├── outlets/                    # Outlet types
│           └── index.ts                    # Main exports
│
├── 🌐 apps/                                # Application-specific code only
│   ├── 📱 client/                         # Client application
│   │   ├── app/                           # Next.js app router
│   │   ├── components/                    # Client-specific components ONLY
│   │   ├── lib/                           # ⚠️ PARTIAL - auth, hooks, utils still exist
│   │   │   ├── auth/                      # ❌ REMOVE - moved to @rentalshop/auth
│   │   │   ├── hooks/                     # ❌ REMOVE - moved to @rentalshop/hooks
│   │   │   └── utils/                     # ❌ REMOVE - moved to @rentalshop/utils
│   │   └── hooks/                         # ❌ REMOVE - moved to @rentalshop/hooks
│   │
│   ├── 🖥️ admin/                          # Admin application
│   │   ├── app/                           # Next.js app router
│   │   ├── components/                    # Admin-specific components ONLY
│   │   ├── lib/                           # ⚠️ PARTIAL - auth, hooks still exist
│   │   │   ├── auth/                      # ❌ REMOVE - moved to @rentalshop/auth
│   │   │   └── hooks/                     # ❌ REMOVE - moved to @rentalshop/hooks
│   │   └── hooks/                         # ❌ REMOVE - moved to @rentalshop/hooks
│   │
│   └── 🔌 api/                            # API server
│       ├── app/                           # Next.js app router
│       ├── lib/                           # API-specific only
│       │   ├── swagger/                   # API documentation
│       │   ├── middleware/                # API middleware
│       │   ├── controllers/               # API controllers
│       │   ├── validators/                # API validators
│       │   ├── utils/                     # API utilities
│       │   ├── jwt-edge.ts                # Edge-specific JWT
│       │   └── database/                  # ❌ REMOVE - use @rentalshop/database
│       └── types/                         # API-specific types
│
├── 🗄️ prisma/                             # Database (UNCHANGED)
├── 📋 scripts/                             # Scripts (UNCHANGED)
└── ⚙️ config/                              # Build configs (UNCHANGED)
```

## 📊 **CONSOLIDATION STATUS**

### ✅ **COMPLETED PHASES**
- **Phase 1: API Layer Consolidation** - ✅ **100% COMPLETE**
- **Phase 2: Authentication Consolidation** - ✅ **100% COMPLETE**
- **Phase 3: Configuration Consolidation** - ✅ **100% COMPLETE**
- **Phase 4: Types Package Creation** - ✅ **100% COMPLETE**

### 🔄 **CURRENT PHASE**
- **Phase 5: Hooks Package Population** - 🚧 **IN PROGRESS**

## 🛠️ **DEVELOPMENT COMMANDS**

### **Package Management**
```bash
# Install dependencies
yarn install

# Add dependency to specific package
cd packages/ui && yarn add react-hook-form

# Add workspace dependency
yarn add @rentalshop/types --workspace=packages/ui
```

### **Building & Development**
```bash
# Build all packages
yarn build:packages

# Build specific package
cd packages/types && yarn build
cd packages/ui && yarn build

# Watch mode for development
cd packages/ui && yarn dev

# Type checking
yarn type-check
```

### **Database Operations**
```bash
# Run migrations
yarn db:migrate

# Reset database
yarn db:reset

# Seed database
yarn db:seed

# Generate Prisma client
yarn db:generate

# Studio (database GUI)
yarn db:studio
```

### **Testing & Quality**
```bash
# Run tests
yarn test

# Lint code
yarn lint

# Format code
yarn format

# Type check
yarn type-check
```

## 🌐 **ACCESSING APPLICATIONS**

After starting development:

- **Client App**: http://localhost:3000
- **Admin App**: http://localhost:3001  
- **API Server**: http://localhost:3002
- **API Docs**: http://localhost:3002/docs
- **Database Studio**: http://localhost:5555

## 🎯 **COMPONENT ORGANIZATION RULES**

### **📁 `/forms` - Pure Form Components**
- **Purpose**: Reusable form logic and validation
- **Characteristics**: No API calls, no business logic, pure presentation
- **Examples**: `LoginForm`, `CustomerForm`, `ProductForm`, `OrderForm`
- **When to use**: Form inputs, validation, state management

### **📁 `/ui` - Shared UI Primitives**
- **Purpose**: Reusable UI components across all contexts
- **Characteristics**: Pure presentation, multiple variants, no business logic
- **Examples**: `Button`, `Card`, `Input`, `Table`, `Dialog`
- **When to use**: Basic UI elements, layouts, design system components

### **📁 `/features` - Business Logic Components**
- **Purpose**: Complete business features with API integration
- **Characteristics**: API calls, business logic, combines multiple components
- **Examples**: `Products/`, `Customers/`, `Orders/`, `Users/`, `Dashboard/`
- **When to use**: Business operations, data management, complex features

### **📁 `/layout` - Layout Components**
- **Purpose**: Page structure and navigation
- **Characteristics**: Layout logic, navigation, no business domain knowledge
- **Examples**: Navigation bars, sidebars, page wrappers
- **When to use**: Page structure, navigation, layout management

## 📦 **PACKAGE USAGE**

### **UI Components**
```typescript
import { Button, Card, Input, Select } from '@rentalshop/ui';
import { LoginForm, CustomerForm } from '@rentalshop/ui';
import { Users, Products, Orders } from '@rentalshop/ui';
```

### **Authentication**
```typescript
import { useAuth, loginUser, logoutUser } from '@rentalshop/auth';
import { hasAnyRole, canManageUsers } from '@rentalshop/auth';
```

### **API Client**
```typescript
import { 
  getProducts, 
  createCustomer, 
  searchOrders 
} from '@rentalshop/utils';
```

### **Database**
```typescript
import { prisma } from '@rentalshop/database';
```

### **Types**
```typescript
import type { User, Product, Order } from '@rentalshop/types';
```

## 🔐 **USER ROLE SYSTEM**

### **Four-Tier Role Hierarchy**:
1. **ADMIN** - System-wide access (no merchant/outlet restrictions)
2. **MERCHANT** - Organization-wide access (merchant only, no outlet)
3. **OUTLET_ADMIN** - Full outlet access (merchant + outlet)
4. **OUTLET_STAFF** - Limited outlet access (merchant + outlet)

### **Authorization Functions**:
```typescript
import { 
  hasAnyRole, 
  assertAnyRole, 
  isMerchantLevel, 
  isOutletTeam,
  canManageUsers,
  canManageOutlets,
  canManageProducts 
} from '@rentalshop/auth';
```

## 🔧 **DEVELOPMENT RULES**

### **DRY Principles**:
- ✅ Use shared packages for all common functionality
- ✅ Never duplicate configurations across packages
- ✅ Use centralized imports (`@rentalshop/ui`, `@rentalshop/auth`, etc.)
- ❌ Don't create app-specific versions of shared components

### **Component Organization**:
- **`/forms`** - Pure form components (NO business logic, NO API calls)
- **`/features`** - Business logic components (API calls, business operations)

### **Authorization**:
- ✅ Always check user permissions before sensitive operations
- ✅ Use proper role-based access control functions
- ✅ Validate user scope (merchant/outlet restrictions)

## 📊 **PERFORMANCE OPTIMIZATION**

### **Database**:
- ✅ Proper indexing on frequently queried fields
- ✅ Composite indexes for complex queries
- ✅ Pagination for large datasets
- ❌ No N+1 queries

### **Bundle**:
- ✅ Tree shaking with specific imports
- ✅ External dependencies configuration
- ✅ Minimal bundle sizes

## 🚨 **SECURITY**

### **Authentication**:
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Scope validation (merchant/outlet isolation)

### **Input Validation**:
- ✅ Zod schemas for all inputs
- ✅ Database constraints
- ✅ Role assignment validation

## 🐛 **TROUBLESHOOTING**

### **Common Issues**

**1. Types not found**
```bash
# Rebuild types package
cd packages/types && yarn build

# Reinstall dependencies
cd ../.. && yarn install
```

**2. Build errors**
```bash
# Clean and rebuild
yarn clean
yarn build:packages
```

**3. Database connection issues**
```bash
# Check environment variables
cat .env.local

# Test database connection
yarn db:studio
```

**4. Port conflicts**
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### **Development Tips**
- Always run `yarn build:packages` after making changes to shared packages
- Use `yarn type-check` to catch type errors early
- Check the console for detailed error messages
- Use the database studio to verify data

## 📈 **NEXT STEPS**

1. ✅ **Complete Phase 4** - Types package creation
2. **Continue Phase 5** - Hooks package population
3. **Clean up old directories** - Remove moved files
4. **Update all imports** - Use shared packages
5. **Test and validate** - Ensure everything works

## 🤝 **CONTRIBUTING**

1. Follow the DRY principles
2. Use shared packages for common functionality
3. Implement proper authorization
4. Follow TypeScript best practices
5. Test your changes thoroughly

## 📄 **LICENSE**

This project is licensed under the MIT License.