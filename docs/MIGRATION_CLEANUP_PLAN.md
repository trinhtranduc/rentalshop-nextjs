# Cleanup Migration Strategy - Use Only Prisma Migrations

## Problem Analysis

**Current Issues:**
1. **Duplicate Logic**: `start.sh` uses direct SQL (currency columns, UserSession, OutletStock) while migration files exist
2. **Inconsistent Approach**: Some changes use migrations, others use direct SQL
3. **Maintenance Burden**: Must update both `start.sh` and migration files
4. **Duplicate Migrations**: Two OutletStock migration files exist (20250121120001 and 20251121153338)

**Root Cause:**
- Comment in `start.sh` line 6: "bypassing Prisma migrate for existing databases"
- This was likely a workaround for backward compatibility
- But now creates confusion and maintenance issues

## Solution: Use Only Prisma Migrations

### Step 1: Review Migration Files
- Check all existing migration files
- Ensure all database changes are covered in migrations
- Identify what SQL in `start.sh` needs migration files

### Step 2: Create Missing Migrations (if needed)
- Check if currency columns have migration files
- Check if UserSession has migration files
- Create migrations for any missing changes

### Step 3: Cleanup Duplicate Migrations
- Remove duplicate OutletStock migration (keep the newer one: 20251121153338)
- Ensure migration files are properly ordered

### Step 4: Simplify start.sh
- Remove all direct SQL execution (currency, UserSession, OutletStock)
- Keep only `prisma migrate deploy` command
- Keep Prisma Client generation
- Keep Next.js server start

### Step 5: Update Documentation
- Update migration guide to reflect single approach
- Remove references to direct SQL in start.sh
- Document that all changes must go through migrations

## Files to Update

1. **apps/api/start.sh**
   - Remove lines 6-150 (all direct SQL)
   - Keep only: Prisma generate, migrate deploy, Next.js start

2. **prisma/migrations/**
   - Remove duplicate: `20250121120001_create_outlet_stock/`
   - Keep: `20251121153338_create_outlet_stock/`
   - Verify all changes have migration files

3. **docs/DATABASE_MIGRATION_GUIDE.md**
   - Update to reflect single migration approach
   - Remove references to direct SQL

## Benefits

- ✅ **Single Source of Truth**: All changes tracked in migration files
- ✅ **Version Control**: Migration history in git
- ✅ **Consistency**: Same approach for all database changes
- ✅ **Maintainability**: Only one place to update
- ✅ **Rollback Support**: Can rollback migrations if needed
- ✅ **Team Collaboration**: Clear migration history

## Migration Flow After Cleanup

```
1. Modify schema.prisma
2. Create migration: yarn db:migrate:dev
3. Commit migration file
4. Push to git
5. Docker runs: prisma migrate deploy (in start.sh)
6. Migration applied automatically
```

## Implementation Steps

1. Review all migration files
2. Remove duplicate OutletStock migration
3. Create missing migrations if needed
4. Simplify start.sh (remove all SQL)
5. Update documentation
6. Test migration flow

