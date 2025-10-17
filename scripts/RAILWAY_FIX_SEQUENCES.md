# 🔧 Fix Railway Database Sequence Issue

## Problem

Getting error when creating new records:
```json
{
  "success": false,
  "code": "DUPLICATE_ENTRY",
  "message": "Record with this information already exists",
  "error": "Field: id"
}
```

## Root Cause

Railway database has **auto-increment sequences out of sync** with actual data.

This happened because:
1. Old code created records with manual ID generation
2. Sequences were not updated when records were created
3. New code uses Prisma `@default(autoincrement())` which tries to use already-taken IDs

## Solution

Reset all database sequences to match the actual max IDs.

### Method 1: Using Railway CLI (Recommended)

```bash
# 1. Install Railway CLI (if not installed)
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link to your project
railway link

# 4. Connect to database
railway connect

# 5. Run the reset script
\i scripts/reset-sequences.sql

# Or run directly:
railway run psql $DATABASE_URL -f scripts/reset-sequences.sql
```

### Method 2: Using Railway Dashboard

1. Go to https://railway.app
2. Select your project
3. Click on **PostgreSQL** service
4. Click on **Data** tab
5. Click on **Query** button
6. Copy and paste contents from `scripts/reset-sequences.sql`
7. Click **Run**

### Method 3: Fresh Database (Nuclear Option)

⚠️ **Warning: This will delete ALL data!**

```bash
# In Railway dashboard or CLI
railway run npx prisma migrate reset --force
railway run npx prisma migrate deploy
railway run yarn db:regenerate-system  # If you have this script
```

## Verify Fix

After running the script, test registration again:

```bash
curl 'https://dev-apis-development.up.railway.app/api/auth/register' \
  -H 'content-type: application/json' \
  --data-raw '{"name":"Test User","email":"test@example.com","password":"12345678","firstName":"Test","lastName":"User","phone":"1234567890","role":"MERCHANT","businessName":"Test Business","businessType":"GENERAL","pricingType":"FIXED","address":"123 Test St","city":"Test City","state":"TS","zipCode":"12345","country":"Vietnam"}'
```

Should return **201 Created** instead of **409 Conflict**.

## Why This Happens

**PostgreSQL sequences** track the next ID to use for auto-increment fields. When you:

1. Create records with manual IDs (e.g., `id: 5`)
2. Don't update the sequence
3. Sequence still thinks next ID is 1, 2, 3...
4. Next auto-generated record tries to use ID 1 → **Conflict!**

## Prevention

✅ **Always use Prisma auto-increment** - Don't manually set IDs
✅ **Use transactions** - Atomic operations prevent partial failures  
✅ **Let Prisma handle IDs** - `@id @default(autoincrement())`

## Files

- `scripts/reset-sequences.sql` - SQL script to reset sequences
- This README - Instructions

## Status

- ✅ Code fixed with transactions
- ✅ All commits pushed to Railway
- ⏳ Waiting for sequences to be reset on Railway database

