# 🔄 Orders Reset and Regeneration Script

## Overview

This script (`reset-orders-2025.js`) will reset all existing orders in your database and regenerate them with the updated order structure that includes:

- **Order Types**: `RENT` and `SALE` (simplified from the previous `RENT_TO_OWN`)
- **Order Statuses**: `BOOKED`, `ACTIVE`, `RETURNED`, `COMPLETED`, `CANCELLED`

## 🚀 Quick Start

### Option 1: Using Package Script (Recommended)
```bash
yarn db:reset-orders
```

### Option 2: Direct Execution
```bash
node scripts/reset-orders-2025.js
```

## 📋 What the Script Does

### Phase 1: Reset
1. **Deletes all payments** (due to foreign key constraints)
2. **Deletes all order items** (due to foreign key constraints)  
3. **Deletes all orders**

### Phase 2: Regenerate
1. **Creates 100 new orders** (25 per outlet for 4 outlets)
2. **Uses new order types**: RENT and SALE only
3. **Uses new statuses** with proper business logic:
   - **RENT orders**: BOOKED → ACTIVE → RETURNED (or CANCELLED)
   - **SALE orders**: BOOKED → COMPLETED (or CANCELLED)
4. **Creates realistic order data** with proper relationships
5. **Generates order items** for each order
6. **Creates payment records** for deposits and completed orders

## 🎯 Order Status Flow

### RENT Orders
- **BOOKED**: Future pickup date, future return date
- **ACTIVE**: Past pickup, future return, customer currently renting
- **RETURNED**: Past pickup and return, rental completed
- **CANCELLED**: Order cancelled before pickup

### SALE Orders  
- **BOOKED**: Future pickup date
- **COMPLETED**: Past pickup, sale finalized
- **CANCELLED**: Order cancelled before pickup

## 📊 Expected Output

After running the script, you should see:
- **100 total orders** (25 per outlet)
- **Realistic distribution** of order types and statuses
- **Proper relationships** between orders, customers, products, and outlets
- **Realistic dates** based on order status
- **Proper pricing** calculations for both rent and sale orders

## ⚠️ Important Notes

1. **This script will DELETE ALL EXISTING ORDERS** - make sure you have backups if needed
2. **Requires existing data**: merchants, outlets, customers, and products must exist first
3. **Uses your current database schema** - make sure Prisma is up to date
4. **Generates realistic test data** suitable for development and testing

## 🔧 Prerequisites

Before running this script, ensure you have:
- ✅ Database running and accessible
- ✅ Prisma client generated (`npx prisma generate`)
- ✅ Existing merchants, outlets, customers, and products in the database
- ✅ Node.js and npm/yarn installed

## 🚨 Troubleshooting

### Error: "No merchants found"
- Run the main database seed script first: `yarn db:seed`

### Error: "No outlets found"  
- Ensure merchants have outlets created

### Error: "No customers found"
- Ensure merchants have customers created

### Error: "No products found"
- Ensure merchants have products and categories created

### Database connection errors
- Check your `DATABASE_URL` environment variable
- Ensure your database is running
- Verify Prisma schema is up to date

## 📈 Sample Output

```
🚀 Starting Order Reset and Regeneration Process...

🗑️  Resetting all orders, order items, and payments...
✅ Deleted all payments
✅ Deleted all order items  
✅ Deleted all orders
🎉 Orders reset completed successfully!

🌱 Regenerating orders with new structure...
📊 Found: 2 merchants, 4 outlets, 60 customers, 60 products

🏪 Creating orders for outlet: Main Branch (Rental Shop Demo)
  ✅ Created RENT order: ORD-001-0001 - BOOKED - $75.00
  ✅ Created SALE order: ORD-001-0002 - BOOKED - $120.00
  ✅ Created RENT order: ORD-001-0003 - ACTIVE - $50.00
  ✅ Created SALE order: ORD-001-0004 - COMPLETED - $200.00
  ✅ Created RENT order: ORD-001-0005 - RETURNED - $80.00
  📋 Created 25 orders for Main Branch

🏪 Creating orders for outlet: Downtown Branch (Rental Shop Demo)
  📋 Created 25 orders for Downtown Branch

🏪 Creating orders for outlet: Beach Branch (Outdoor Equipment Co.)
  📋 Created 25 orders for Beach Branch

🏪 Creating orders for outlet: Mountain Branch (Outdoor Equipment Co.)
  📋 Created 25 orders for Mountain Branch

🎉 Order regeneration completed!
📊 Total orders created: 100

📈 Order Summary:
  RENT:
    BOOKED: 25
    ACTIVE: 20
    RETURNED: 15
    CANCELLED: 5
  SALE:
    BOOKED: 15
    COMPLETED: 20

🎉 Process completed successfully!

📋 What was accomplished:
  ✅ All existing orders, order items, and payments deleted
  ✅ Orders regenerated with new RENT/SALE types
  ✅ Orders use new statuses: BOOKED, ACTIVE, RETURNED, COMPLETED, CANCELLED
  ✅ Realistic order data with proper relationships
  ✅ 100 total orders (25 per outlet)
  ✅ Proper order status flow based on order type
```

## 🔄 Reverting Changes

If you need to revert to your previous orders:
1. **Restore from backup** if you created one
2. **Run the main seed script**: `yarn db:seed` (this will recreate the original order structure)
3. **Manually recreate orders** using your previous data

## 💡 Tips

- **Run this during development** when you need fresh order data
- **Use for testing** new order-related features
- **Perfect for demos** with realistic rental shop data
- **Great for performance testing** with 100+ orders
