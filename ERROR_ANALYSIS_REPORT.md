# Database Error Analysis Report

## 🔴 Critical Errors Found

### 1. **Missing Database Tables (CRITICAL)**
**Error Pattern**: `relation "table_name" does not exist`

**Affected Tables**:
- `User` / `user`
- `Merchant` / `merchant`
- `Outlet` / `outlet`
- `Customer` / `customer`
- `Product` / `product`
- `Category` / `category`
- `Order` / `order`
- `OrderItem` / `orderitem`
- `Payment` / `payment`
- `Plan` / `plan`
- `Subscription` / `subscription`
- `SubscriptionActivity` / `subscriptionactivity`
- `AuditLog` / `auditlog`
- `EmailVerification` / `emailverification`
- `UserSession` / `usersession`
- `OutletStock` / `outletstock`
- `BankAccount` (trying to create but `Outlet` doesn't exist)
- `BillingCycle`
- `Session`
- `TestTable`

**Root Cause**: Database migrations have not been applied or database is in inconsistent state.

**Impact**: 
- Application cannot function
- All CRUD operations will fail
- Seed scripts cannot run

---

### 2. **Missing Prisma Migrations Table (CRITICAL)**
**Error**: `relation "_prisma_migrations" does not exist`

**Occurrences**:
- Line 121: `2025-11-28 14:42:06.171 UTC`
- Line 127: `2025-11-28 14:42:52.070 UTC`
- Line 134: `2025-11-28 14:43:45.781 UTC`

**Root Cause**: Prisma migrations have never been initialized on this database.

**Impact**: Prisma cannot track migration history.

---

### 3. **Missing Database Sequences (HIGH)**
**Error Pattern**: `relation "table_id_seq" does not exist`

**Affected Sequences**:
- `user_id_seq`
- `merchant_id_seq`
- `outlet_id_seq`
- `category_id_seq`
- `product_id_seq`
- `customer_id_seq`
- `order_id_seq`
- `orderitem_id_seq`
- `payment_id_seq`
- `subscription_id_seq`
- `emailverification_id_seq`
- `auditlog_id_seq`

**Root Cause**: Sequences are created when tables are created. Since tables don't exist, sequences don't exist.

**Impact**: Auto-increment IDs won't work.

---

### 4. **Sequence Value Out of Bounds (MEDIUM)**
**Error**: `setval: value 0 is out of bounds for sequence "SequenceName_id_seq" (1..2147483647)`

**Affected Sequences**:
- `SubscriptionActivity_id_seq`
- `EmailVerification_id_seq`
- `PasswordReset_id_seq`
- `UserSession_id_seq`
- `AuditLog_id_seq`
- `MerchantRole_id_seq`

**Root Cause**: Seed script trying to set sequence to 0, but PostgreSQL sequences start at 1.

**Impact**: Seed scripts fail when trying to reset sequences.

---

### 5. **Missing Column (MEDIUM)**
**Error**: `column User.customRoleId does not exist at character 443`

**Occurrence**: Line 117

**Root Cause**: Schema mismatch - code expects `customRoleId` column but it doesn't exist in database.

**Impact**: User creation/update operations will fail.

---

### 6. **Duplicate Key Violations (MEDIUM)**
**Error Pattern**: `duplicate key value violates unique constraint`

**Specific Errors**:
1. **Subscription**: `duplicate key value violates unique constraint "Subscription_pkey"`
   - Line 162: Key (id)=(1) already exists
   
2. **Merchant**: `duplicate key value violates unique constraint "Merchant_tenantKey_key"`
   - Line 237: Key ("tenantKey")=(aodaipham) already exists
   
3. **Customer**: `duplicate key value violates unique constraint "Customer_merchantId_phone_key"`
   - Line 537: Key ("merchantId", phone)=(7, ) already exists
   - Line 599: Key ("merchantId", phone)=(7, ) already exists
   - Line 769: Key ("merchantId", phone)=(5, ) already exists
   - Line 772: Key ("merchantId", phone)=(5, ) already exists
   - Line 794: Key ("merchantId", phone)=(5, ) already exists
   - Line 797: Key ("merchantId", phone)=(5, ) already exists
   - Line 807: Key ("merchantId", phone)=(5, ) already exists

**Root Cause**: 
- Seed scripts trying to insert duplicate data
- Missing proper cleanup before seeding
- Race conditions in concurrent inserts

**Impact**: Data integrity issues, seed scripts fail.

---

### 7. **Configuration Error (LOW)**
**Error**: `unrecognized configuration parameter "db_type"`

**Occurrences**:
- Line 527: `2025-12-01 23:47:31.983 UTC`
- Line 640: `2025-12-03 05:46:18.839 UTC`
- Line 679: `2025-12-03 09:42:31.671 UTC`

**Root Cause**: Invalid PostgreSQL configuration parameter being set.

**Impact**: Connection initialization may fail.

---

### 8. **Connection Reset Errors (INFO)**
**Error**: `could not receive data from client: Connection reset by peer`

**Occurrences**: Hundreds of occurrences throughout the log

**Root Cause**: 
- Client connections being terminated
- Network issues
- Connection pool exhaustion
- Timeout issues

**Impact**: Intermittent connection failures, but not critical if retries work.

---

## 🔧 Recommended Solutions

### **Priority 1: Fix Database State**

1. **Initialize Prisma Migrations**:
```bash
# Check current migration status
npx prisma migrate status

# If migrations table doesn't exist, initialize it
npx prisma migrate deploy

# Or reset and apply all migrations (WARNING: This will delete all data)
npx prisma migrate reset
```

2. **Apply All Pending Migrations**:
```bash
# Apply migrations without resetting data
npx prisma migrate deploy

# Or in development
npx prisma migrate dev
```

3. **Regenerate Prisma Client**:
```bash
npx prisma generate
```

### **Priority 2: Fix Seed Scripts**

1. **Fix Sequence Reset Logic**:
   - Change `setval(sequence_name, 0, true)` to `setval(sequence_name, 1, false)`
   - Or use `SELECT COALESCE(MAX(id), 0) + 1` to get next value

2. **Add Proper Cleanup**:
   - Delete existing data before seeding
   - Check for existing records before inserting
   - Use `ON CONFLICT` clauses for upsert operations

3. **Fix Duplicate Key Issues**:
   - Add unique constraint checks
   - Use `INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`
   - Clear existing data before seeding

### **Priority 3: Fix Schema Mismatch**

1. **Check Prisma Schema**:
   - Verify `User` model has `customRoleId` field if code expects it
   - Or remove `customRoleId` references from code if not needed

2. **Create Migration**:
```bash
# If customRoleId should exist
npx prisma migrate dev --name add_custom_role_id

# If customRoleId should be removed from code
# Remove references and regenerate client
```

### **Priority 4: Fix Configuration**

1. **Remove Invalid Config**:
   - Check connection string and remove `db_type` parameter
   - Verify all PostgreSQL connection parameters are valid

---

## 📋 Action Plan

### **Immediate Actions**:

1. ✅ **Check Database Connection**:
   ```bash
   npx prisma db pull
   ```

2. ✅ **Verify Migration Status**:
   ```bash
   npx prisma migrate status
   ```

3. ✅ **Apply Migrations**:
   ```bash
   # For production
   npx prisma migrate deploy
   
   # For development (will reset if needed)
   npx prisma migrate dev
   ```

4. ✅ **Regenerate Client**:
   ```bash
   npx prisma generate
   ```

5. ✅ **Fix Seed Scripts**:
   - Update sequence reset logic
   - Add proper cleanup
   - Handle duplicates

### **Verification Steps**:

1. Check if `_prisma_migrations` table exists
2. Verify all tables from schema exist
3. Test seed scripts
4. Verify no duplicate key errors
5. Test application CRUD operations

---

## 🚨 Critical Warning

**The database appears to be in an uninitialized state. All migrations need to be applied before the application can function properly.**

**Before running migrations in production, ensure you have:**
- ✅ Database backups
- ✅ Migration rollback plan
- ✅ Tested migrations in staging environment

---

## 📊 Error Summary

| Error Type | Count | Severity | Status |
|------------|-------|----------|--------|
| Missing Tables | 20+ | 🔴 CRITICAL | Needs Fix |
| Missing Migrations Table | 3 | 🔴 CRITICAL | Needs Fix |
| Missing Sequences | 12+ | 🟠 HIGH | Needs Fix |
| Sequence Out of Bounds | 6 | 🟡 MEDIUM | Needs Fix |
| Missing Column | 1 | 🟡 MEDIUM | Needs Fix |
| Duplicate Keys | 8+ | 🟡 MEDIUM | Needs Fix |
| Config Error | 3 | 🟢 LOW | Needs Fix |
| Connection Resets | 100+ | 🔵 INFO | Monitor |

---

## 🔍 Next Steps

1. **Run diagnostic command**:
   ```bash
   npx prisma migrate status
   ```

2. **Check database state**:
   ```bash
   npx prisma db pull
   ```

3. **Review migration files** in `prisma/migrations/`

4. **Fix seed scripts** to handle duplicates and sequences properly

5. **Test migrations** in development before applying to production

