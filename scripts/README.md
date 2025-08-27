# Database Seeding Scripts

This directory contains scripts for resetting and seeding the database with sample data.

## Available Scripts

### 1. Simple Seeding Script (Recommended for Development)
**File:** `reset-and-seed-database-simple.js`

**Features:**
- ✅ No external dependencies required
- ✅ Simple password hashing (development only)
- ✅ Complete database reset and recreation
- ✅ Creates realistic sample data

**What it creates:**
- 🏢 **2 Merchants**: TechRent Pro, EventGear Solutions
- 🏪 **4 Outlets**: 2 per merchant (Downtown + Westside branches)
- 👥 **8 Users**: 1 admin + 1 staff per outlet
- 🏷️ **20 Categories**: 10 categories per merchant
- 📦 **60 Products**: 3 products per category
- 👤 **60 Customers**: 30 per merchant
- 📋 **120 Orders**: 30 per outlet

### 2. Full Seeding Script (Production-like)
**File:** `reset-and-seed-database.js`

**Features:**
- ✅ Uses bcryptjs for proper password hashing
- ✅ More secure for production-like environments
- ✅ Same data structure as simple version

**Requirements:**
```bash
npm install bcryptjs
# or
yarn add bcryptjs
```

## Quick Start

### Option 1: Using Package Scripts (Recommended)
```bash
# Reset database and seed with simple script
yarn db:reset

# Just seed the database (without reset)
yarn db:seed

# Use full seeding script (requires bcryptjs)
yarn db:seed:full
```

### Option 2: Direct Script Execution
```bash
# Simple seeding (no dependencies)
node scripts/reset-and-seed-database-simple.js

# Full seeding (requires bcryptjs)
node scripts/reset-and-seed-database.js
```

## Database Structure Created

### Merchants
1. **TechRent Pro** - Professional technology equipment rental
2. **EventGear Solutions** - Event and party equipment rental

### Outlets (2 per merchant)
- **Downtown Branch** - Main location with full inventory
- **Westside Branch** - Suburban location

### Users (2 per outlet)
- **Outlet Admin** - Full access to outlet operations
- **Outlet Staff** - Limited access for basic operations

### Product Categories (10 per merchant)
- Electronics, Audio Equipment, Lighting, Furniture, Tools
- Party Supplies, Sports Equipment, Camping Gear, Office Equipment, Medical Devices

### Products (3 per category)
- Each product has realistic pricing (rent, sale, deposit)
- Stock levels and availability tracking
- Barcode generation for inventory management

### Customers (30 per merchant)
- Realistic names and contact information
- Addresses across major US cities
- Unique email addresses for each customer

### Orders (30 per outlet)
- Mix of RENT, SALE, and RENT_TO_OWN types
- Various statuses (PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED)
- Realistic pickup and return dates
- Order items with quantities and pricing

## Login Credentials

After seeding, you can log in with these credentials:

### Outlet Admins
- **Email:** `admin.1@techrentpro-downtownbranch.com`
- **Password:** `admin123`

- **Email:** `admin.2@techrentpro-westsidebranch.com`
- **Password:** `admin123`

- **Email:** `admin.3@eventgearsolutions-downtownbranch.com`
- **Password:** `admin123`

- **Email:** `admin.4@eventgearsolutions-westsidebranch.com`
- **Password:** `admin123`

### Outlet Staff
- **Email:** `staff.1@techrentpro-downtownbranch.com`
- **Password:** `staff123`

- **Email:** `staff.2@techrentpro-westsidebranch.com`
- **Password:** `staff123`

- **Email:** `staff.3@eventgearsolutions-downtownbranch.com`
- **Password:** `staff123`

- **Email:** `staff.4@eventgearsolutions-westsidebranch.com`
- **Password:** `staff123`

## Data Relationships

```
Merchant (1) → Outlets (2) → Users (2) + Products + Customers + Orders
    ↓
  Categories (10) → Products (3 each)
    ↓
  OutletStock (stock levels per outlet)
    ↓
  Orders (30 per outlet) → OrderItems (1-3 per order)
```

## Customization

You can modify the sample data by editing the constants at the top of each script:

- `MERCHANT_DATA` - Change merchant names and descriptions
- `OUTLET_DATA` - Modify outlet information
- `CUSTOMER_NAMES` - Add/remove customer names
- `PRODUCT_CATEGORIES` - Change product categories
- `ORDER_STATUSES` - Modify order statuses
- `ORDER_TYPES` - Change order types

## Troubleshooting

### Common Issues

1. **Prisma Client Not Generated**
   ```bash
   npx prisma generate
   ```

2. **Database Connection Issues**
   - Check your `.env` file for `DATABASE_URL`
   - Ensure database is running and accessible

3. **Permission Errors**
   - Make sure you have write access to the database
   - Check database user permissions

4. **Schema Mismatch**
   ```bash
   npx prisma db push
   # or
   npx prisma migrate dev
   ```

### Reset Database Schema
If you need to completely reset the database schema:
```bash
npx prisma db push --force-reset
```

## Production Notes

⚠️ **Important:** The simple seeding script uses basic password hashing suitable only for development. For production:

1. Use the full seeding script with bcryptjs
2. Change default passwords immediately after seeding
3. Implement proper user registration flows
4. Use environment-specific data

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify database connectivity and permissions
3. Ensure Prisma schema is up to date
4. Check that all required fields are properly set
