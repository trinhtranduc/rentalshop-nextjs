# Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### 1. Install & Setup

```bash
cd anyrent-new

# Install dependencies
yarn install

# Create .env.local (edit with your PostgreSQL credentials)
cat > .env.local << EOF
MAIN_DATABASE_URL=postgresql://postgres:password@localhost:5432/main_db
DATABASE_URL=postgresql://postgres:password@localhost:5432/template_db
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NODE_ENV=development
EOF

# Create Main DB and setup tables
psql -U postgres -c "CREATE DATABASE main_db;"
yarn setup
```

### 2. Start Servers

Open 3 terminals:

```bash
# Terminal 1: API
cd apps/api && yarn dev

# Terminal 2: Admin  
cd apps/admin && yarn dev

# Terminal 3: Client
cd apps/client && yarn dev
```

### 3. Test

1. Visit http://localhost:3000
2. Create a shop
3. Wait 10-20 seconds for DB creation
4. You're done! ✅

---

## 📋 What Each Command Does

```bash
yarn install          # Install all dependencies
yarn setup            # Setup Main DB + generate Prisma client
yarn db:setup-main    # Create Main DB tables only
yarn db:generate      # Generate Prisma client for Tenant DB
```

---

## 🔍 Verify Setup

```bash
# Check Main DB tables exist
psql -U postgres -d main_db -c "\dt"

# Should show: Merchant, Tenant tables

# Check Prisma client generated
ls node_modules/.prisma/client

# Should show Prisma client files
```

---

## 🎯 First Test

After servers are running:

```bash
# Test registration via API
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Shop",
    "email": "test@example.com",
    "subdomain": "testshop"
  }'

# If successful, you'll get:
# {"success":true,"tenant":{...},"url":"http://testshop.localhost:3000"}
```

---

**Full details**: See `NEXT_STEPS.md` for comprehensive guide
