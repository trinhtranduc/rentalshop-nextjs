# 🚀 Quick Database Setup Guide

## Reset and Seed Your Database

This guide will help you reset your database and populate it with sample data exactly as requested:

- ✅ 2 merchants
- ✅ 2 outlets per merchant (4 total)
- ✅ 1 outlet admin + 1 outlet staff per outlet (8 total users)
- ✅ 30 customers per merchant (60 total)
- ✅ 30 orders per outlet (120 total)

## 🎯 Quick Start (Recommended)

```bash
# Reset database and seed with sample data
yarn db:reset
```

This single command will:
1. Reset your database completely
2. Create all the requested data
3. Set up proper relationships
4. Generate login credentials

## 🔧 Alternative Methods

### Method 1: Package Scripts
```bash
# Reset and seed
yarn db:reset

# Just seed (without reset)
yarn db:seed

# Full seeding with bcrypt (requires bcryptjs)
yarn db:seed:full
```

### Method 2: Direct Script Execution
```bash
# Simple seeding (no dependencies)
node scripts/reset-and-seed-database-simple.js

# Full seeding (requires bcryptjs)
node scripts/reset-and-seed-database.js
```

## 📊 What Gets Created

| Entity | Count | Details |
|--------|-------|---------|
| **Merchants** | 2 | TechRent Pro, EventGear Solutions |
| **Outlets** | 4 | 2 per merchant (Downtown + Westside) |
| **Users** | 8 | 1 admin + 1 staff per outlet |
| **Categories** | 20 | 10 categories per merchant |
| **Products** | 60 | 3 products per category |
| **Customers** | 60 | 30 per merchant |
| **Orders** | 120 | 30 per outlet |

## 🔑 Login Credentials

After seeding, you can log in with these accounts:

### Outlet Admins
- `admin.1@techrentpro-downtownbranch.com` / `admin123`
- `admin.2@techrentpro-westsidebranch.com` / `admin123`
- `admin.3@eventgearsolutions-downtownbranch.com` / `admin123`
- `admin.4@eventgearsolutions-westsidebranch.com` / `admin123`

### Outlet Staff
- `staff.1@techrentpro-downtownbranch.com` / `staff123`
- `staff.2@techrentpro-westsidebranch.com` / `staff123`
- `staff.3@eventgearsolutions-downtownbranch.com` / `staff123`
- `staff.4@eventgearsolutions-westsidebranch.com` / `staff123`

## 🏗️ Data Structure

```
Merchant 1 (TechRent Pro)
├── Outlet 1 (Downtown Branch)
│   ├── Admin User
│   ├── Staff User
│   ├── 30 Orders
│   └── Products + Stock
└── Outlet 2 (Westside Branch)
    ├── Admin User
    ├── Staff User
    ├── 30 Orders
    └── Products + Stock

Merchant 2 (EventGear Solutions)
├── Outlet 3 (Downtown Branch)
│   ├── Admin User
│   ├── Staff User
│   ├── 30 Orders
│   └── Products + Stock
└── Outlet 4 (Westside Branch)
    ├── Admin User
    ├── Staff User
    ├── 30 Orders
    └── Products + Stock
```

## 🚨 Important Notes

1. **This will DELETE all existing data** - make sure you have backups if needed
2. **Passwords are simple** - change them in production
3. **Data is realistic** - suitable for testing and development
4. **Relationships are maintained** - all foreign keys properly set

## 🔍 Verify Setup

After running the script, you should see:
- ✅ Success messages for each entity type
- ✅ Summary showing total counts
- ✅ Login credentials displayed
- ✅ No error messages

## 🆘 Troubleshooting

### Common Issues

1. **"Prisma Client not generated"**
   ```bash
   npx prisma generate
   ```

2. **"Database connection failed"**
   - Check your `.env` file
   - Ensure database is running

3. **"Permission denied"**
   - Check database user permissions
   - Ensure you have write access

4. **"Schema mismatch"**
   ```bash
   npx prisma db push
   ```

### Reset Database Schema
If you need to completely reset the database structure:
```bash
npx prisma db push --force-reset
yarn db:seed
```

## 🎉 Success!

Once the script completes successfully, you'll have:
- A fully populated database
- Realistic sample data
- Proper user roles and permissions
- Complete order management system
- Inventory tracking
- Customer database

You can now test all the features of your rental shop application with realistic data!

---

**Need help?** Check the detailed documentation in `scripts/README.md`
