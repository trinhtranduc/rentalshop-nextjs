# Database Seed Scripts

This directory contains scripts for seeding and managing the rental shop database.

## 🎯 Main Seed Script

### `seed-database.js` - Complete Database Seeding

This is the **main and only script** you need to run to set up your development database. It creates all necessary entities in the correct order with proper relationships.

#### What it creates:

1. **🏢 Test Merchant** - A test rental shop business
2. **🏪 Test Outlet** - A main store location
3. **👥 Users with Different Roles** (5 users as defined in README):
   - `admin@rentalshop.com` / `admin123` - System Administrator (ADMIN role)
   - `merchant@rentalshop.com` / `merchant123` - Business Owner (MERCHANT role)
   - `manager@rentalshop.com` / `manager123` - Outlet Manager (OUTLET_ADMIN role)
   - `staff@rentalshop.com` / `staff123` - Store Staff (OUTLET_STAFF role)
   - `client@rentalshop.com` / `client123` - Customer (CLIENT role)
4. **👤 50 Test Customers** - Comprehensive customer database with realistic data
   - Diverse names, cities, states, and contact information
   - Proper ID types and numbers
   - Geographic distribution across USA
5. **📂 11 Product Categories** - Comprehensive category system
   - Electronics, Tools, Party Equipment, Sports, Furniture
   - Photography, Garden & Landscaping, Kitchen Equipment
   - Cleaning Equipment, Medical Equipment, Construction
6. **📦 50 Test Products** - Diverse product catalog
   - Distributed across all categories
   - Realistic pricing and inventory levels
   - Proper barcodes and descriptions
   - Image URLs for future use
7. **📊 Outlet Stock** - Proper inventory tracking for each product
8. **📋 50 Test Orders** - Complete order management system
   - Mix of RENT, SALE, and RENT_TO_OWN orders
   - Various statuses (PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED)
   - Realistic pickup and return dates
   - Order items and payment records
   - Collateral information and notes

#### Features:

- ✅ **Idempotent** - Can be run multiple times safely
- ✅ **Public ID Generation** - Automatically generates sequential public IDs
- ✅ **Proper Relationships** - Creates all necessary foreign key relationships
- ✅ **Role-Based Access** - Users are created with proper role assignments
- ✅ **Duplicate Prevention** - Checks for existing entities before creating
- ✅ **Comprehensive Logging** - Shows what's being created and any issues
- ✅ **Realistic Data** - Generates diverse, realistic test data
- ✅ **Complete System** - Creates a fully functional rental shop database

#### Usage:

```bash
# Navigate to the scripts directory
cd scripts

# Install dependencies if not already installed
npm install @prisma/client bcryptjs

# Run the seed script
node seed-database.js
```

#### Expected Output:

```
🌱 Starting comprehensive database seeding...

🏢 Creating test merchant...
✅ Created merchant: Test Rental Shop (ID: 1)

🏪 Creating test outlet...
✅ Created outlet: Main Store (ID: 1)

👥 Creating users with different roles...
✅ Created ADMIN user: System Administrator (admin@rentalshop.com)
✅ Created MERCHANT user: Business Owner (merchant@rentalshop.com)
✅ Created OUTLET_ADMIN user: Outlet Manager (manager@rentalshop.com)
✅ Created OUTLET_STAFF user: Store Staff (staff@rentalshop.com)
✅ Created CLIENT user: John Client (client@rentalshop.com)

👤 Creating 50 test customers...
✅ Created customer: John Smith (john.smith1@example.com)
✅ Created customer: Sarah Johnson (sarah.johnson2@example.com)
✅ Created customer: Michael Williams (michael.williams3@example.com)
✅ Created customer: Emily Brown (emily.brown4@example.com)
✅ Created customer: David Jones (david.jones5@example.com)
   ... and 45 more customers
✅ Created 50 customers total

📂 Creating test categories...
✅ Created category: Electronics
✅ Created category: Tools
✅ Created category: Party Equipment
✅ Created category: Sports Equipment
✅ Created category: Furniture
✅ Created category: Photography
✅ Created category: Garden & Landscaping
✅ Created category: Kitchen Equipment
✅ Created category: Cleaning Equipment
✅ Created category: Medical Equipment
✅ Created category: Construction

📦 Creating 50 test products...
✅ Created product: iPhone 15 Pro (IPHONE15PRO001)
✅ Created product: Drill Set (DRILLSET001)
✅ Created product: Party Tent (TENT001)
✅ Created product: Treadmill (TREADMILL001)
✅ Created product: Office Chair (CHAIR001)
   ... and 45 more products
✅ Created 50 products total

📋 Creating 50 test orders...
✅ Created order: ORD-000001 - RENT - $32.50
✅ Created order: ORD-000002 - SALE - $18.75
✅ Created order: ORD-000003 - RENT_TO_OWN - $45.20
✅ Created order: ORD-000004 - RENT - $28.90
✅ Created order: ORD-000005 - SALE - $22.15
   ... and 45 more orders
✅ Created 50 orders total

🎉 Comprehensive database seeding completed successfully!

📊 Summary:
   Merchant: Test Rental Shop (ID: 1)
   Outlet: Main Store (ID: 1)
   Users: 5 created
   Customers: 50 created
   Categories: 11 created
   Products: 50 created
   Orders: 50 created

🔑 Login Credentials:
   Admin: admin@rentalshop.com / admin123
   Merchant: merchant@rentalshop.com / merchant123
   Manager: manager@rentalshop.com / manager123
   Staff: staff@rentalshop.com / staff123
   Client: client@rentalshop.com / client123

💡 All entities have been created with proper public IDs and relationships.
   - 50 customers with realistic data
   - 50 products across 11 categories
   - 50 orders with order items and payments
   - Proper inventory tracking with outlet stock
```

## 🔧 Other Scripts

### `seed-50-orders-2025.js` - Additional Order Seeding

Creates 50 additional sample orders for testing the order management system. **This is now optional** since the main seed script already creates 50 orders. Run this if you want more orders or different order patterns.

### Utility Scripts

- `verify-public-ids.js` - Verifies that all entities have proper public IDs
- `generate-public-ids.js` - Generates public IDs for existing entities
- `check-customers.js` - Lists all customers in the database
- `check-users.js` - Lists all users in the database

## 🚀 Quick Start

1. **Complete setup**: Run `node seed-database.js` (creates everything you need)
2. **Additional orders** (optional): Run `node seed-50-orders-2025.js`
3. **Verify setup**: Run `node check-users.js` and `node check-customers.js`

## 📝 Notes

- All scripts use the **local database** (SQLite) by default
- Scripts are **idempotent** - safe to run multiple times
- **Public IDs** are automatically generated and sequential (1, 2, 3, ...)
- **Passwords** are hashed using bcrypt with 10 salt rounds
- **Relationships** are properly maintained between all entities
- **Realistic data** is generated for comprehensive testing
- **50 entities each** for customers, products, and orders

## 🗑️ Cleanup

To reset the database completely:

```bash
# Reset the database
npx prisma migrate reset

# Re-run the seed script
node seed-database.js
```

## 🔒 Security Notes

- Default passwords are simple for development only
- Change passwords in production
- All passwords are properly hashed using bcrypt
- Users are created with appropriate role-based access control

## 🎯 Data Distribution

The seed script creates a well-balanced dataset:

- **Customers**: 50 customers across 50 different cities and states
- **Products**: 50 products distributed across 11 categories (4-5 products per category)
- **Orders**: 50 orders with realistic rental periods and pricing
- **Categories**: 11 comprehensive business categories covering all rental shop needs
- **Users**: 5 users with different roles for testing all access levels
