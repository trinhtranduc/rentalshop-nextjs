# Rental Shop Next.js Monorepo

A comprehensive rental shop management system built with Next.js, featuring a monorepo architecture with shared packages for authentication, database operations, UI components, and business logic.

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

**Merchant Accounts:**
- `merchant1@example.com` / `merchant123`
- `merchant2@example.com` / `merchant123`

**Outlet Admins:**
- `admin.outlet1@example.com` / `admin123`
- `admin.outlet2@example.com` / `admin123`
- `admin.outlet3@example.com` / `admin123`
- `admin.outlet4@example.com` / `admin123`

**Outlet Staff:**
- `staff.outlet1@example.com` / `staff123`
- `staff.outlet2@example.com` / `staff123`
- `staff.outlet3@example.com` / `staff123`
- `staff.outlet4@example.com` / `staff123`

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
- **OUTLET users**: Automatically restricted to their specific outlet
- **MERCHANT users**: Can access data from all their outlets
- **ADMIN users**: Full system access across all merchants

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
```