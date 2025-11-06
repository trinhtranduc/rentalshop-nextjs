# Testing Guide - Multi-Tenant Demo

## Pre-Testing Checklist

Before running tests, ensure:

- [ ] Setup completed successfully (`yarn setup`)
- [ ] All 3 servers running (API, Admin, Client)
- [ ] Main database accessible
- [ ] .env.local configured correctly

## Quick Verification

```bash
# Run verification script
yarn verify
```

This checks:
- ✅ Directory structure
- ✅ Required files
- ✅ Environment variables
- ✅ Prisma configuration
- ✅ Dependencies installed

## Test Scenarios

### Test 1: Registration Flow

**Goal**: Create a new tenant and verify database isolation

**Steps**:

1. **Start all servers**:
   ```bash
   # Terminal 1
   cd apps/api && yarn dev
   
   # Terminal 2
   cd apps/admin && yarn dev
   
   # Terminal 3
   cd apps/client && yarn dev
   ```

2. **Access Admin App**:
   - Open: http://localhost:3000
   - Should see registration form

3. **Create First Tenant**:
   - Business Name: "Test Shop 1"
   - Email: "shop1@test.com"
   - Subdomain: "shop1" (or leave empty for auto-generation)
   - Click "Create Shop"

4. **Verify Success**:
   - Should see success message
   - Should redirect to tenant subdomain
   - Check terminal logs for database creation

5. **Check Database Created**:
   ```bash
   psql -U $(whoami) -l | grep shop
   # Should see: shop1_db or similar
   ```

**Expected Results**:
- ✅ Tenant created in Main DB
- ✅ New database created
- ✅ Redirect to subdomain works
- ✅ Tenant dashboard loads

---

### Test 2: Data Isolation

**Goal**: Verify tenants cannot see each other's data

**Steps**:

1. **Create Second Tenant**:
   - Return to http://localhost:3000
   - Create "Test Shop 2" with subdomain "shop2"

2. **Add Product to Shop 1**:
   ```bash
   curl -X POST http://localhost:3002/api/products \
     -H "Content-Type: application/json" \
     -H "x-tenant-subdomain: shop1" \
     -d '{
       "name": "Product A",
       "description": "Shop 1 Product",
       "price": 99.99,
       "stock": 10
     }'
   ```

3. **Add Product to Shop 2**:
   ```bash
   curl -X POST http://localhost:3002/api/products \
     -H "Content-Type: application/json" \
     -H "x-tenant-subdomain: shop2" \
     -d '{
       "name": "Product B",
       "description": "Shop 2 Product",
       "price": 199.99,
       "stock": 5
     }'
   ```

4. **Verify Isolation**:
   ```bash
   # Get Shop 1 products
   curl -H "x-tenant-subdomain: shop1" http://localhost:3002/api/products
   # Should only show Product A
   
   # Get Shop 2 products
   curl -H "x-tenant-subdomain: shop2" http://localhost:3002/api/products
   # Should only show Product B
   ```

**Expected Results**:
- ✅ Shop 1 only sees its products
- ✅ Shop 2 only sees its products
- ✅ Complete data isolation

---

### Test 3: Subdomain Routing

**Goal**: Verify subdomain-based routing works

**Steps**:

1. **Setup localhost subdomains** (macOS/Linux):
   ```bash
   sudo nano /etc/hosts
   
   # Add:
   127.0.0.1 shop1.localhost
   127.0.0.1 shop2.localhost
   ```

2. **Access Shop 1**:
   - Open: http://shop1.localhost:3000
   - Should load Shop 1's dashboard
   - Should show Shop 1's data

3. **Access Shop 2**:
   - Open: http://shop2.localhost:3000
   - Should load Shop 2's dashboard
   - Should show Shop 2's data

4. **Access Root Domain**:
   - Open: http://localhost:3000
   - Should redirect to admin/registration

**Expected Results**:
- ✅ Subdomain routing works
- ✅ Correct tenant data loads
- ✅ Root domain redirects to admin

---

### Test 4: API Endpoints

**Goal**: Verify all API endpoints work correctly

**Steps**:

1. **Get Tenant Info**:
   ```bash
   curl -H "x-tenant-subdomain: shop1" \
     http://localhost:3002/api/tenant/info
   ```
   **Expected**: Returns tenant metadata

2. **List Products** (empty initially):
   ```bash
   curl -H "x-tenant-subdomain: shop1" \
     http://localhost:3002/api/products
   ```
   **Expected**: Returns empty array `[]`

3. **Create Product**:
   ```bash
   curl -X POST http://localhost:3002/api/products \
     -H "Content-Type: application/json" \
     -H "x-tenant-subdomain: shop1" \
     -d '{
       "name": "Test Product",
       "description": "A test product",
       "price": 49.99,
       "stock": 100
     }'
   ```
   **Expected**: Returns created product object

4. **List Products Again**:
   ```bash
   curl -H "x-tenant-subdomain: shop1" \
     http://localhost:3002/api/products
   ```
   **Expected**: Returns array with created product

**Expected Results**:
- ✅ All endpoints return correct status codes
- ✅ Data persists correctly
- ✅ Tenant scoping works

---

### Test 5: Error Handling

**Goal**: Verify error handling for invalid inputs

**Steps**:

1. **Invalid Subdomain**:
   ```bash
   curl -H "x-tenant-subdomain: nonexistent" \
     http://localhost:3002/api/tenant/info
   ```
   **Expected**: 404 or error response

2. **Missing Header**:
   ```bash
   curl http://localhost:3002/api/products
   ```
   **Expected**: 400 or error response

3. **Duplicate Subdomain**:
   - Try to create tenant with existing subdomain
   **Expected**: Error message, tenant not created

4. **Invalid Product Data**:
   ```bash
   curl -X POST http://localhost:3002/api/products \
     -H "Content-Type: application/json" \
     -H "x-tenant-subdomain: shop1" \
     -d '{"name": ""}'  # Missing required fields
   ```
   **Expected**: Validation error

**Expected Results**:
- ✅ Proper error messages
- ✅ No crashes or 500 errors
- ✅ User-friendly error responses

---

### Test 6: Database Operations

**Goal**: Verify database operations work correctly

**Steps**:

1. **Check Main DB Tables**:
   ```bash
   psql -U $(whoami) -d main_db -c "\dt"
   ```
   **Expected**: Should show `Tenant` and `Merchant` tables

2. **Check Tenant Records**:
   ```bash
   psql -U $(whoami) -d main_db -c "SELECT subdomain, name FROM \"Tenant\";"
   ```
   **Expected**: Should show created tenants

3. **Check Tenant Databases**:
   ```bash
   psql -U $(whoami) -l | grep -E "shop|tenant"
   ```
   **Expected**: Should list tenant databases

4. **Check Tenant DB Schema**:
   ```bash
   psql -U $(whoami) -d shop1_db -c "\dt"
   ```
   **Expected**: Should show `User`, `Product`, `Order` tables

**Expected Results**:
- ✅ All tables created correctly
- ✅ Data stored properly
- ✅ Relationships work

---

## Automated Test Script

Create a test script to run all scenarios:

```bash
#!/bin/bash
# scripts/test-all.sh

echo "🧪 Running Multi-Tenant Demo Tests..."

# Test 1: Registration
echo "Test 1: Registration..."
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Automated Test Shop",
    "email": "test@automated.com",
    "subdomain": "autotest"
  }' && echo "✅ Registration works"

# Test 2: Tenant Info
echo "Test 2: Tenant Info..."
curl -H "x-tenant-subdomain: autotest" \
  http://localhost:3002/api/tenant/info && echo "✅ Tenant info works"

# Test 3: Products CRUD
echo "Test 3: Products..."
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: autotest" \
  -d '{"name":"Test Product","price":99.99,"stock":10}' \
  && echo "✅ Product creation works"

curl -H "x-tenant-subdomain: autotest" \
  http://localhost:3002/api/products && echo "✅ Product listing works"

echo "✅ All tests completed!"
```

## Performance Testing

### Database Connection Caching

**Test**: Verify tenant connections are cached

1. Make first request to tenant (should create connection)
2. Make second request quickly (should use cached connection)
3. Check logs for connection reuse

**Expected**: Second request faster, reuses connection

### Multiple Tenants

**Test**: Create 5+ tenants and verify all work

1. Create 5 different tenants
2. Access each subdomain
3. Verify data isolation maintained
4. Check database count

**Expected**: All tenants work independently

## Troubleshooting Tests

If tests fail:

1. **Check Server Logs**: Look for error messages
2. **Verify Database**: Ensure Main DB and tenant DBs exist
3. **Check Environment**: Verify .env.local is correct
4. **Prisma Client**: Run `yarn db:generate` if needed
5. **Clear Cache**: Restart servers if connection issues

## Success Criteria

All tests pass when:

- ✅ Registration creates tenant + database
- ✅ Data isolation works (tenants can't see each other)
- ✅ Subdomain routing works
- ✅ All API endpoints respond correctly
- ✅ Error handling works properly
- ✅ Database operations succeed
- ✅ No Prisma initialization errors

## Next Steps After Testing

Once all tests pass:

1. ✅ Pattern proven to work
2. ✅ Ready for production deployment
3. ✅ Can add more features
4. ✅ Can scale to more tenants

---

**Happy Testing!** 🚀
