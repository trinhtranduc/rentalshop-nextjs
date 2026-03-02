# 🔧 Resolve Failed Migration Guide

## 📋 Problem

When a migration fails in production, Prisma will not apply any new migrations until the failed migration is resolved. This guide shows how to resolve failed migrations.

## 🔍 Identify Failed Migration

Check migration status:

```bash
# Via Railway Dashboard → API Service → Shell
npx prisma migrate status --schema=./prisma/schema.prisma
```

You'll see output like:
```
migrate found failed migrations in the target database, new migrations will not be applied.
The `20260213093402_add_collateral_image_url` migration started at 2026-02-13 06:43:05.726304 UTC failed
```

## ✅ Solution: Resolve Failed Migration

### Option 1: Mark as Applied (Recommended)

If the migration changes were already applied manually or the column already exists:

```bash
# Via Railway Dashboard → API Service → Shell
npx prisma migrate resolve --applied 20260213093402_add_collateral_image_url --schema=./prisma/schema.prisma
```

### Option 2: Mark as Rolled-back

If the migration failed and changes were not applied:

```bash
# Via Railway Dashboard → API Service → Shell
npx prisma migrate resolve --rolled-back 20260213093402_add_collateral_image_url --schema=./prisma/schema.prisma
```

### Option 3: Use Script

```bash
# Via Railway Dashboard → API Service → Shell
./scripts/resolve-failed-migration.sh 20260213093402_add_collateral_image_url --applied
# or
./scripts/resolve-failed-migration.sh 20260213093402_add_collateral_image_url --rolled-back
```

## 📦 Apply Pending Migrations

After resolving the failed migration, apply pending migrations:

```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## 🔍 Verify

Check migration status again:

```bash
npx prisma migrate status --schema=./prisma/schema.prisma
```

Expected output:
```
Database schema is up to date!
```

## 🚨 Current Issue

**Failed Migration:** `20260213093402_add_collateral_image_url`

**Reason:** This migration was a duplicate of `20250210000000_add_collateral_image_url`. The column `collateralImageUrl` already exists, so the migration failed.

**Solution:**
1. Mark as applied (since column already exists):
   ```bash
   npx prisma migrate resolve --applied 20260213093402_add_collateral_image_url --schema=./prisma/schema.prisma
   ```

2. Apply pending migrations:
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

3. Verify:
   ```bash
   npx prisma migrate status --schema=./prisma/schema.prisma
   ```

## 📝 Notes

- **Never delete migrations from database manually** - Always use `prisma migrate resolve`
- **Check if column exists** before marking as applied:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'Order' AND column_name = 'collateralImageUrl';
  ```
- **After resolving**, new migrations will be applied automatically on next deploy
