# ⚠️ APPLY MIGRATION TO RAILWAY - ACTION REQUIRED

## 🎯 Current Status

✅ **Code deployed to Railway** - Deployment successful  
❌ **Migration NOT applied** - UserSession table does not exist  
⏸️  **Login API failing** - "The table `public.UserSession` does not exist"

## 🚀 Quick Fix (2 steps)

### Step 1: Get Railway DATABASE_URL

1. Go to **Railway Dashboard**: https://railway.app
2. Select your project
3. Click on **PostgreSQL** service
4. Go to **Variables** tab
5. Copy the **DATABASE_URL** value (starts with `postgresql://`)

### Step 2: Apply Migration

Open terminal and run:

```bash
# Set Railway DATABASE_URL (paste your actual URL)
export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

# Apply migration
cd /Users/mac/Source-Code/rentalshop-nextjs
npx prisma migrate deploy
```

**Expected output:**
```
✔ Generated Prisma Client
Applying migration `20251016000000_add_user_sessions`
The following migration have been applied:

migrations/
  └─ 20251016000000_add_user_sessions/
    └─ migration.sql

✔ All migrations have been successfully applied
```

## 🧪 Verify Migration

After applying migration, run test:

```bash
# Check if API is working
./scripts/quick-migration-check.sh

# If successful, run full test
API_URL="https://dev-apis-development.up.railway.app" node tests/single-session-test.js
```

## 📋 Alternative: Use Helper Script

```bash
# Interactive script that guides you through the process
./scripts/apply-single-session-migration.sh
```

## 🔍 What This Migration Does

Creates the `UserSession` table:

```sql
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL UNIQUE,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");
CREATE INDEX "UserSession_userId_isActive_idx" ON "UserSession"("userId", "isActive");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- Foreign key
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
```

## ⚡ Why Migration Wasn't Auto-Applied

Railway auto-deploys code but doesn't always auto-run migrations because:
1. Migrations can be destructive (drop tables, columns)
2. Requires explicit confirmation for production databases
3. Needs DATABASE_URL environment variable to be properly set

## 🎉 After Migration Success

You'll be able to:
- ✅ Login successfully
- ✅ Run tests
- ✅ Use single session enforcement
- ✅ Validate session behavior

## 📞 Need Help?

If you get errors:

**Error: "Connection refused"**
- Check DATABASE_URL is correct
- Verify PostgreSQL service is running on Railway

**Error: "Migration already applied"**
- Good! It means it's already done
- Proceed to run tests

**Error: "Permission denied"**
- Check DATABASE_URL has correct credentials
- Verify database user has CREATE TABLE permission

## ✅ Checklist

- [ ] Get DATABASE_URL from Railway
- [ ] Run `export DATABASE_URL="..."`
- [ ] Run `npx prisma migrate deploy`
- [ ] See success message
- [ ] Run `./scripts/quick-migration-check.sh`
- [ ] Run full test suite
- [ ] Celebrate! 🎉

---

**Time required**: 2-3 minutes  
**Risk level**: Low (only adds new table, doesn't modify existing data)  
**Rollback**: Can drop table if needed: `DROP TABLE "UserSession";`

