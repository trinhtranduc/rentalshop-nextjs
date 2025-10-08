# Rental Shop Next.js Monorepo

A comprehensive rental shop management system built with Next.js, featuring a monorepo architecture with shared packages for authentication, database operations, UI components, and business logic.

## 📚 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Setup Supabase, Cloudinary, and Vercel
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deploy your apps to production

## 🚀 Quick Start

### **Complete System Setup (Recommended)**
```bash
# Regenerate entire system with fresh data
yarn db:regenerate-system
```

This single command will create:
- ✅ 2 merchants (each with 1 merchant account)
- ✅ 4 outlets (2 per merchant)
- ✅ 8 users (1 admin + 1 staff per outlet)
- ✅ 60 customers (30 per merchant)
- ✅ 60 products (30 per merchant)
- ✅ 120 orders (30 per outlet)

### **Alternative Setup Options**
```bash
# Reset and seed database
yarn db:reset

# Just seed (without reset)
yarn db:seed

# Reset only orders
yarn db:reset-orders
```

## 🔑 Default Login Credentials

After running `yarn db:regenerate-system`:

### **👑 Super Admin (System-wide Access)**
- `admin@rentalshop.com` / `admin123`
  - **Full system access** to all merchants and outlets
  - **Manage subscription plans** and system settings
  - **View all data** across the platform
  - **Platform operations** and system management

### **🏢 Merchant Accounts (Business Owners)**
- `merchant1@example.com` / `merchant123` (Merchant 1)
- `merchant2@example.com` / `merchant123` (Merchant 2)
  - **Organization-wide access** within their merchant
  - **Manage multiple outlets** and users

### **🏪 Outlet Admins (Outlet Managers)**
- `admin.outlet1@example.com` / `admin123` (Outlet 1 - Merchant 1)
- `admin.outlet2@example.com` / `admin123` (Outlet 2 - Merchant 1)
- `admin.outlet3@example.com` / `admin123` (Outlet 1 - Merchant 2)
- `admin.outlet4@example.com` / `admin123` (Outlet 2 - Merchant 2)
  - **Full access** to their assigned outlet
  - **Manage outlet operations** and staff

### **👥 Outlet Staff (Outlet Employees)**
- `staff.outlet1@example.com` / `staff123` (Outlet 1 - Merchant 1)
- `staff.outlet2@example.com` / `staff123` (Outlet 2 - Merchant 1)
- `staff.outlet3@example.com` / `staff123` (Outlet 1 - Merchant 2)
- `staff.outlet4@example.com` / `staff123` (Outlet 2 - Merchant 2)
  - **Limited access** to their assigned outlet
  - **Basic operations** and customer service

## 🚀 Quick Start - Admin Panel

### **1. Start All Services**
```bash
yarn dev:all
```

### **2. Access Admin Panel**
- **URL**: `http://localhost:3001`
- **Login**: `admin@rentalshop.com` / `admin123`

### **3. Admin Dashboard Focus: System Operations**

The admin dashboard is designed for **platform management** rather than individual business operations:

#### **🏠 Dashboard (System Overview)**
- **Platform Health Status** - API, Database, Uptime monitoring
- **System Metrics** - Total merchants, users, revenue across platform
- **Recent Activity** - New registrations, system alerts, maintenance notices
- **Quick Actions** - Common admin tasks, emergency controls

#### **🏢 Merchants (Merchant Management)**
- **Merchant Directory** - View all merchants, search, filter by status
- **Merchant Details** - Business info, subscription status, outlet count
- **Merchant Actions** - Activate/deactivate, upgrade/downgrade plans
- **Merchant Analytics** - Performance metrics, growth trends
- **Bulk Operations** - Mass updates, bulk plan changes

#### **📋 Plans (Subscription Management)**
- **Plan Creation** - Design new subscription tiers with features
- **Plan Configuration** - Set pricing, features, trial periods
- **Plan Updates** - Modify existing plans, add/remove features
- **Plan Analytics** - Popular plans, conversion rates, revenue per plan
- **Trial Management** - Configure trial days, trial-to-paid conversion

#### **💰 Payments (Billing & Revenue)**
- **Payment History** - All transactions across platform
- **Billing Management** - Invoice generation, payment tracking
- **Revenue Analytics** - Platform revenue, merchant payments
- **Refund Management** - Process refunds, handle disputes
- **Tax Configuration** - Set tax rates, generate tax reports

#### **👥 Users (User Management)**
- **User Directory** - All users across platform
- **Role Management** - Assign roles, manage permissions
- **Access Control** - User access logs, security monitoring
- **Bulk User Operations** - Mass role changes, bulk deactivation

#### **⚙️ Settings (System Configuration)**
- **Platform Configuration** - Site settings, feature toggles
- **Email Templates** - Customize system emails
- **Notification Settings** - Configure alerts, webhooks
- **API Management** - API keys, rate limits, documentation
- **Maintenance Mode** - System downtime, scheduled maintenance

#### **📊 Analytics (Platform Analytics)**
- **Platform Growth** - Merchant registration trends
- **Revenue Analytics** - Platform earnings, growth metrics
- **User Behavior** - Login patterns, feature usage
- **Performance Metrics** - System performance, load times
- **Business Intelligence** - Custom reports, data exports

#### **🔒 Security (Security & Monitoring)**
- **Security Monitoring** - Login attempts, suspicious activity
- **Audit Logs** - All admin actions, system changes
- **Data Privacy** - GDPR compliance, data export/deletion
- **Backup Management** - Database backups, recovery procedures

### **4. Key Benefits of Admin Panel**

1. **🎯 System-Focused** - Admin focuses on platform operations, not individual business metrics
2. **🏢 Merchant-Centric** - Easy management of all merchants and their subscriptions
3. **📋 Plan Management** - Flexible subscription plan creation and management
4. **💰 Revenue Control** - Complete oversight of platform revenue and billing
5. **🔒 Security First** - Comprehensive security monitoring and access control
6. **📊 Data-Driven** - Platform analytics for business decisions
7. **⚙️ Configurable** - Flexible system settings and configurations

### **5. Navigation Structure**

```
ADMIN DASHBOARD
├── 🏠 Dashboard (System Overview)
├── 🏢 Merchants (Merchant Management)
├── 📋 Plans (Subscription Plans)
├── 💰 Payments (Billing & Revenue)
├── 👥 Users (User Management)
├── ⚙️ Settings (System Configuration)
├── 📊 Analytics (Platform Analytics)
└── 🔒 Security (Security & Monitoring)
```

## 🏗️ Architecture Overview

This monorepo follows a **dual ID system** for optimal security and usability:

## 🔒 Security-First Design

**CRITICAL: All role-based access control is implemented at the backend/database level, NEVER on the frontend.**

### **Why This Matters:**
- **Frontend filtering is a security vulnerability** - hackers can bypass restrictions
- **Backend filtering is secure** - cannot be manipulated by users
- **JWT tokens contain user scope** - automatically enforced in all database queries
- **API responses are pre-filtered** - users only see data they're authorized to access

### **Role-Based Data Access:**
- **OUTLET_STAFF users**: Automatically restricted to their specific outlet
- **OUTLET_ADMIN users**: Can access data from their assigned outlet
- **MERCHANT users**: Can access data from all their outlets
- **ADMIN users**: **Full system access** across all merchants and outlets

## 📋 Updated Order System (2025)

### **Order Types (Simplified)**
- **RENT**: Equipment rental orders
- **SALE**: Direct purchase orders

### **Order Statuses**
- **RESERVED**: New order, scheduled for pickup
- **PICKUPED**: Currently being rented (RENT only)
- **RETURNED**: Rental completed (RENT only)
- **COMPLETED**: Sale finalized (SALE only)
- **CANCELLED**: Order cancelled (both types)

### **Order Numbering**
- **Consistent format**: `ORD-{outletId}-{sequence}`
- **Structure**: `ORD-{outletId}-{sequence}` where:
  - `{outletId}`: 3-digit outlet identifier (e.g., 001, 002)
  - `{sequence}`: 4-digit sequential order number per outlet (e.g., 0001, 0002)
- **Examples**: `ORD-001-0001`, `ORD-001-0002`, `ORD-002-0001`
- **Benefits**: Easy outlet identification, sequential tracking, human-readable

### **Order Status Flow**
```
RENT Orders: RESERVED → PICKUPED → RETURNED (or CANCELLED)
SALE Orders: RESERVED → COMPLETED (or CANCELLED)
```

## 🔐 **Dual ID Strategy: CUIDs Internally, Numbers Externally**

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
- **IDs**: Use `id Int @id @default(autoincrement())` for all operations
- **Relationships**: All foreign keys use CUIDs internally

#### **API Layer (Transform)**
- **Input**: Frontend sends `id` (numbers) for all operations
- **Processing**: API uses `id` directly for database operations
- **Output**: API returns `id` (numbers) to frontend

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
  where: { id: 123 }  // Find by number
});
// Result: { id: 123, name: "Outlet Name" }

const customer = await prisma.customer.findUnique({
  where: { id: 456 }  // Find by number
});
// Result: { id: 456, name: "Customer Name" }

// 4️⃣ DATABASE OPERATIONS (CUIDs)
const order = await prisma.order.create({
  data: {
    outletId: "clx123abc",    // Use CUID
    customerId: "dme456def",  // Use CUID
    // ... other fields
  }
});
// Result: { id: 999, orderNumber: "ORD-001-0001" }

// 5️⃣ API RETURNS (Numbers)
return {
  id: 999,              // id (number)
  outletId: 123,        // id (number)
  customerId: 456,      // id (number)
  orderNumber: "ORD-001-0001"
};

// 6️⃣ FRONTEND RECEIVES (Numbers)
const response = {
  id: 999,              // Number
  outletId: 123,        // Number
  customerId: 456,      // Number
  orderNumber: "ORD-001-0001"
};
```

## 🎯 **Admin vs Client Application Focus**

### **🏠 Admin Application (`apps/admin`)**
- **Purpose**: Platform management and system operations
- **Focus**: System-wide metrics, merchant management, subscription plans
- **Users**: System administrators and platform operators
- **Features**: Merchant management, plan configuration, system analytics

### **🏪 Client Application (`apps/client`)**
- **Purpose**: Individual business operations
- **Focus**: Daily operations, customer management, order processing
- **Users**: Merchant owners, outlet managers, staff
- **Features**: Product management, customer service, order processing

## 🚀 **Development Commands**

### **Start All Applications**
```bash
# Start all apps (admin, client, api) concurrently
yarn dev:all

# Individual app development
yarn dev:admin      # Admin panel (port 3001)
yarn dev:client     # Client app (port 3000)
yarn dev:api        # API server (port 3002)
```

### **Database Operations**
```bash
# Regenerate entire system
yarn db:regenerate-system

# Reset database
yarn db:reset

# Seed database
yarn db:seed
```

### **Build & Deploy**
```bash
# Build all packages
yarn build

# Build specific package
yarn workspace @rentalshop/ui build
```

## 📁 **Project Structure**

```
rentalshop-nextjs/
├── apps/
│   ├── admin/           # Admin dashboard (System operations)
│   ├── client/          # Client application (Business operations)
│   └── api/             # Backend API server
├── packages/
│   ├── ui/              # Shared UI components (Pure presentation)
│   ├── auth/            # Authentication & authorization
│   ├── database/        # Database utilities & Prisma
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions & API clients
│   └── hooks/           # React hooks & business logic
├── prisma/              # Database schema & migrations
└── scripts/             # Development & deployment scripts
```

## 🔌 **API Architecture**

### **Separation of Concerns**
- **UI Components** (`packages/ui/`): Pure presentation components with no API logic
- **API Clients** (`packages/utils/src/api/`): Centralized API request functions
- **App Pages** (`apps/*/app/`): Business logic and API integration
- **Backend APIs** (`apps/api/app/api/`): Server-side endpoints

### **API Client Structure**
```
packages/utils/src/api/
├── auth.ts              # Authentication API
├── audit-logs.ts        # Audit logs API
├── customers.ts         # Customer management API
├── orders.ts            # Order management API
├── products.ts          # Product management API
├── settings.ts          # Settings management API
├── users.ts             # User management API
└── index.ts             # Export all API clients
```

### **Usage Pattern**
```typescript
// ✅ CORRECT: Use API clients in app pages
// apps/admin/app/audit-logs/page.tsx
import { getAuditLogs } from '@rentalshop/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    getAuditLogs().then(setLogs);
  }, []);
  
  return <AuditLogViewer logs={logs} />;
}

// ❌ WRONG: Don't put API logic in UI components
// packages/ui/src/components/features/AuditLogs/AuditLogViewer.tsx
export function AuditLogViewer() {
  // Don't make API calls here!
  const [logs, setLogs] = useState([]);
  // ...
}
```

## 🔧 **Technology Stack**

- **Frontend**: Next.js 13+ with App Router
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with role-based access control
- **UI**: Tailwind CSS with custom component library
- **State Management**: React hooks and context
- **Type Safety**: Full TypeScript support
- **Monorepo**: Yarn workspaces with Turborepo

## 📚 **Documentation**

- **Environment Setup**: See `docs/ENVIRONMENT_SETUP.md`
- **Database Setup**: See `DATABASE_SETUP.md`
- **API Review**: See `API_REVIEW.md`
- **Component Library**: See `packages/ui/README.md`

## 🤝 **Contributing**

1. Follow the established monorepo structure
2. Use shared packages for common functionality
3. Maintain consistent TypeScript types
4. Follow security-first principles
5. Test all changes thoroughly

## 📄 **License**

This project is proprietary software. All rights reserved.