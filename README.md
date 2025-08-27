# Rental Shop Next.js Monorepo

A comprehensive rental shop management system built with Next.js, featuring a monorepo architecture with shared packages for authentication, database operations, UI components, and business logic.

## 🏗️ Architecture Overview

This monorepo follows a **dual ID system** for optimal security and usability:

### 🔐 **Dual ID Strategy: CUIDs Internally, Numbers Externally**

Our system implements a **dual ID approach** that provides both security and usability:

#### **System Architecture**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │     API     │    │  Database   │    │   Types     │
│  (Numbers)  │◄──►│ (Transform) │◄──►│  (CUIDs)   │    │ (Interface) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### **Database Layer (Secure)**
- **Primary Keys**: Use CUIDs (`String @id @default(cuid())`) for security
- **Public IDs**: Maintain `publicId Int @unique` for user-friendly operations
- **Relationships**: All foreign keys use CUIDs internally

#### **API Layer (Transform)**
- **Input**: Frontend sends `publicId` (numbers) for all operations
- **Processing**: API converts `publicId` to CUID for database operations
- **Output**: API returns `publicId` (numbers) to frontend

#### **Frontend Layer (User-Friendly)**
- **Display**: Always works with numbers (`outletId: 123`)
- **Forms**: Send numbers for all ID fields
- **URLs**: Use numbers for routing (`/outlets/123`)

#### **Complete Data Flow Example**

**Scenario: Create Order for Outlet 123, Customer 456**

```typescript
// 1️⃣ FRONTEND SENDS (Numbers)
POST /api/orders
{
  "outletId": 123,
  "customerId": 456,
  "productId": 789
}

// 2️⃣ API RECEIVES (Numbers)
const input: OrderCreateInput = {
  outletId: 123,        // Number
  customerId: 456,      // Number
  productId: 789        // Number
};

// 3️⃣ API TRANSFORMS (Numbers → CUIDs)
const outlet = await prisma.outlet.findUnique({
  where: { publicId: 123 }  // Find by number
});
// Result: { id: "clx123abc", publicId: 123 }

const customer = await prisma.customer.findUnique({
  where: { publicId: 456 }  // Find by number
});
// Result: { id: "dme456def", publicId: 456 }

// 4️⃣ DATABASE OPERATIONS (CUIDs)
const order = await prisma.order.create({
  data: {
    outletId: "clx123abc",    // Use CUID
    customerId: "dme456def",  // Use CUID
    // ... other fields
  }
});
// Result: { id: "fgh789ghi", publicId: 999 }

// 5️⃣ API TRANSFORMS (CUIDs → Numbers)
return {
  id: 999,              // publicId (number)
  outletId: 123,        // publicId (number)
  customerId: 456,      // publicId (number)
  orderNumber: "2025-001"
};

// 6️⃣ FRONTEND RECEIVES (Numbers)
const response = {
  id: 999,              // Number
  outletId: 123,        // Number
  customerId: 456,      // Number
  orderNumber: "2025-001"
};
```

#### **Implementation Rules**

**Frontend Rules:**
```typescript
// ✅ ALWAYS use numbers
const outletId = 123;
const customerId = 456;

// ❌ NEVER use CUIDs
const outletId = "clx123abc";  // Wrong!
```

**API Rules:**
```typescript
// ✅ Convert numbers to CUIDs for database
const outlet = await prisma.outlet.findUnique({
  where: { publicId: input.outletId }
});

// ✅ Use CUIDs for database operations
await prisma.order.create({
  data: { outletId: outlet.id }
});

// ✅ Return numbers to frontend
return { id: order.publicId };
```

**Database Rules:**
```typescript
// ✅ Always use CUIDs for relationships
model Order {
  outletId String  // CUID, not number
  customerId String // CUID, not number
}

// ✅ Include publicId for external access
model Outlet {
  id String @id @default(cuid())      // CUID for relationships
  publicId Int @unique                // Number for external use
}
```

#### **Benefits of This Approach**
- ✅ **Security**: CUIDs prevent enumeration attacks
- ✅ **Usability**: Numbers are easy to work with
- ✅ **Performance**: No complex ID transformations
- ✅ **Standards**: Follows industry best practices
- ✅ **Scalability**: Works across distributed systems

## 🚀 Quick Start

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
│   ├── 🎨 ui/                            # UI component library ✅ COMPLETE
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/                   # Shared UI primitives (buttons, cards, inputs)
│   │       │   ├── features/             # Business logic components ✅ COMPLETE
│   │       │   │   ├── Products/         # Product management
│   │       │   │   ├── Orders/           # Order management
│   │       │   │   ├── Customers/        # Customer management
│   │       │   │   ├── Users/            # User management
│   │       │   │   ├── Dashboard/        # Analytics & reporting
│   │       │   │   ├── Calendars/        # Scheduling & availability
│   │       │   │   ├── Settings/         # Configuration
│   │       │   │   └── Shops/            # Shop management
│   │       │   ├── forms/                # Pure form components ✅ COMPLETE
│   │       │   │   ├── LoginForm.tsx
│   │       │   │   ├── RegisterForm.tsx
│   │       │   │   ├── CustomerForm.tsx
│   │       │   │   ├── ProductForm.tsx
│   │       │   │   ├── OrderForm.tsx
│   │       │   │   ├── CreateOrderForm.tsx
│   │       │   │   └── ForgetPasswordForm.tsx
│   │       │   ├── layout/               # Layout components ✅ COMPLETE
│   │       │   └── charts/               # Chart components ✅ COMPLETE
│   │       ├── hooks/                   # UI-specific hooks
│   │       ├── lib/                     # UI utilities
│   │       └── index.tsx                # Main package exports ✅ COMPLETE
│   │
│   ├── 🔐 auth/                          # Complete authentication system ✅ COMPLETE
│   │   └── src/
│   │       ├── auth.ts                   # Core auth logic
│   │       ├── client/                    # Client-specific auth
│   │       │   └── index.ts              # ✅ COMPLETED
│   │       ├── admin/                     # Admin-specific auth
│   │       │   └── index.ts              # ✅ COMPLETED
│   │       ├── browser.ts                 # Browser auth
│   │       ├── jwt.ts                     # JWT handling
│   │       ├── password.ts                # Password utilities
│   │       ├── authorization.ts           # Role-based access control ✅ COMPLETE
│   │       └── types.ts                   # Auth types
│   │
│   ├── 🗄️ database/                      # Database layer ✅ COMPLETE
│   │   └── src/
│   │       ├── client.ts                  # Prisma client
│   │       ├── models/                    # Database operations
│   │       ├── seed.ts                    # Database seeding
│   │       └── types.ts                   # Database types
│   │
│   ├── 🎣 hooks/                          # React hooks & business logic ✅ COMPLETE
│   │   └── src/
│   │       ├── hooks/                     # Business logic hooks
│   │       │   ├── useAuth.ts             # Authentication hook ✅
│   │       │   ├── useProductAvailability.ts # Product availability hook ✅
│   │       │   ├── useThrottledSearch.ts  # Debounced search hook ✅
│   │       │   └── index.ts               # Hooks exports
│   │       └── index.ts                   # Package exports
│   │
│   ├── 🛠️ utils/                          # Utilities and API layer ✅ COMPLETE
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
│   └── 📝 types/                          # Type system ✅ COMPLETED
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
│   │   ├── lib/                           # Client-specific utilities only
│   │   └── hooks/                         # Client-specific hooks only
│   │
│   ├── 🖥️ admin/                          # Admin application
│   │   ├── app/                           # Next.js app router
│   │   ├── components/                    # Admin-specific components ONLY
│   │   ├── lib/                           # Admin-specific utilities only
│   │   └── hooks/                         # Admin-specific hooks only
│   │
│   └── 🔌 api/                            # API server
│       ├── app/                           # Next.js app router
│       ├── lib/                           # API-specific only
│       │   ├── swagger/                   # API documentation
│       │   ├── middleware/                # API middleware
│       │   ├── controllers/               # API controllers
│       │   ├── validators/                # API validators
│       │   ├── utils/                     # API utilities
│       │   └── jwt-edge.ts                # Edge-specific JWT
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
- **Phase 5: Hooks Package Population** - ✅ **100% COMPLETE**
- **Phase 6: UI Package Consolidation** - ✅ **100% COMPLETE**

### 🎉 **CURRENT STATUS: FULLY CONSOLIDATED**
All shared packages are now complete and properly organized. The monorepo follows best practices with:
- ✅ Centralized UI components (`@rentalshop/ui`)
- ✅ Centralized authentication (`@rentalshop/auth`)
- ✅ Centralized database utilities (`@rentalshop/database`)
- ✅ Centralized types (`@rentalshop/types`)
- ✅ Centralized utilities (`@rentalshop/utils`)
- ✅ Centralized hooks (`@rentalshop/hooks`)

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
- **Examples**: `Products/`, `Customers/`, `