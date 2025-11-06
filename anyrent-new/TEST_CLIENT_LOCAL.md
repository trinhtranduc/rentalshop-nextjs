# Test Client App ở Local

## Yêu Cầu Trước Khi Test

1. ✅ Main database đã setup (`yarn setup`)
2. ✅ Đã có ít nhất 1 tenant được tạo
3. ✅ API server đang chạy (port 3002)
4. ✅ Admin app đang chạy (port 3000) - để tạo tenant

## Bước 1: Setup Localhost Subdomains

### macOS/Linux

```bash
# Backup hosts file trước
sudo cp /etc/hosts /etc/hosts.backup

# Edit hosts file
sudo nano /etc/hosts

# Thêm các dòng sau:
127.0.0.1 shop1.localhost
127.0.0.1 shop2.localhost
127.0.0.1 myshop.localhost
127.0.0.1 test.localhost

# Save và exit (Ctrl+X, Y, Enter)
```

### Windows

1. Mở Notepad **với quyền Administrator**
2. Mở file: `C:\Windows\System32\drivers\etc\hosts`
3. Thêm các dòng:
```
127.0.0.1 shop1.localhost
127.0.0.1 shop2.localhost
127.0.0.1 myshop.localhost
127.0.0.1 test.localhost
```
4. Save file

### Verify Hosts File

```bash
# Test DNS resolution
ping shop1.localhost
# Should show: 127.0.0.1
```

## Bước 2: Tạo Tenant (Nếu Chưa Có)

### Option A: Qua Admin App

1. Mở: http://localhost:3000
2. Điền form:
   - Business Name: "My Shop"
   - Email: "shop@example.com"
   - Subdomain: "shop1" (hoặc để trống)
3. Click "Create Shop"
4. Đợi database được tạo (10-20 giây)
5. Bạn sẽ được redirect đến tenant subdomain

### Option B: Qua API

```bash
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Shop",
    "email": "test@example.com",
    "subdomain": "shop1"
  }'
```

**Lưu ý**: Subdomain phải match với entry trong `/etc/hosts`

## Bước 3: Start Client App

```bash
cd anyrent-new/apps/client
yarn dev
```

Server sẽ chạy trên: **http://localhost:3001**

## Bước 4: Test Client App

### Test 1: Access Tenant Subdomain

1. **Mở browser**: http://shop1.localhost:3001
   - ⚠️ **Lưu ý**: Port 3001, không phải 3000!

2. **Expected Result**:
   - ✅ Page loads
   - ✅ Shows tenant name: "My Shop"
   - ✅ Shows subdomain: "shop1"
   - ✅ Shows empty products list (nếu chưa có products)

### Test 2: Access Root Domain

1. **Mở**: http://localhost:3001
2. **Expected Result**:
   - ✅ Redirects to http://localhost:3000 (admin app)

### Test 3: Access Invalid Subdomain

1. **Mở**: http://nonexistent.localhost:3001
2. **Expected Result**:
   - ✅ Redirects to http://localhost:3000

## Bước 5: Test với Products

### Tạo Product Qua API

```bash
# Tạo product cho shop1
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: shop1" \
  -d '{
    "name": "Product 1",
    "description": "This is a test product",
    "price": 99.99,
    "stock": 10
  }'
```

### Refresh Client App

1. Refresh: http://shop1.localhost:3001
2. **Expected Result**:
   - ✅ Product "Product 1" hiển thị
   - ✅ Price: $99.99
   - ✅ Stock: 10

## Bước 6: Test Data Isolation

### Tạo Tenant Thứ 2

```bash
# Tạo shop2
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Shop 2",
    "email": "shop2@example.com",
    "subdomain": "shop2"
  }'
```

### Tạo Product cho Shop 2

```bash
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: shop2" \
  -d '{
    "name": "Shop 2 Product",
    "description": "Only for shop 2",
    "price": 199.99,
    "stock": 5
  }'
```

### Verify Isolation

1. **Access Shop 1**: http://shop1.localhost:3001
   - Should show: "Product 1" (Shop 1's product only)

2. **Access Shop 2**: http://shop2.localhost:3001
   - Should show: "Shop 2 Product" (Shop 2's product only)

3. **Verify**: Each tenant only sees their own products!

## Troubleshooting

### Issue 1: "Cannot GET /" hoặc Blank Page

**Nguyên nhân**: Subdomain không được detect

**Fix**:
1. Check `/etc/hosts` có entry cho subdomain chưa
2. Verify subdomain trong database:
   ```bash
   psql -U $(whoami) -d main_db -c "SELECT subdomain FROM \"Tenant\";"
   ```
3. Check browser console có lỗi không
4. Verify API server đang chạy: http://localhost:3002/api/tenant/info

### Issue 2: Redirect Loop

**Nguyên nhân**: Middleware redirect không đúng

**Fix**:
- Check middleware logic trong `apps/client/middleware.ts`
- Verify tenant status is "active"
- Check API response from `/api/tenant/info`

### Issue 3: "Failed to load data"

**Nguyên nhân**: API server không accessible

**Fix**:
1. Verify API server đang chạy: `curl http://localhost:3002/api/tenant/info`
2. Check CORS nếu cần
3. Check network tab trong browser DevTools
4. Verify API endpoint URLs trong `apps/client/app/page.tsx`

### Issue 4: Subdomain Không Work

**Nguyên nhân**: Browser cache hoặc hosts file chưa apply

**Fix**:
```bash
# Clear browser cache
# Hoặc test với incognito/private window

# Verify hosts file
cat /etc/hosts | grep localhost

# Restart browser hoàn toàn
```

### Issue 5: Port Conflict

**Nguyên nhân**: Port 3001 đã được sử dụng

**Fix**:
```bash
# Check what's using port 3001
lsof -i :3001

# Kill process nếu cần
kill -9 <PID>

# Hoặc change port trong package.json
```

## Quick Test Script

```bash
#!/bin/bash
# Quick test client app

echo "🧪 Testing Client App..."

# Check if API is running
echo "1. Checking API server..."
curl -s http://localhost:3002/api/tenant/info > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ API server is running"
else
  echo "❌ API server not running! Start it first: cd apps/api && yarn dev"
  exit 1
fi

# Check if client is running
echo "2. Checking client app..."
curl -s http://localhost:3001 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Client app is running"
else
  echo "❌ Client app not running! Start it: cd apps/client && yarn dev"
  exit 1
fi

# Check tenants
echo "3. Checking tenants..."
TENANTS=$(psql -U $(whoami) -d main_db -t -c "SELECT COUNT(*) FROM \"Tenant\";" 2>/dev/null | tr -d ' ')
if [ -n "$TENANTS" ] && [ "$TENANTS" -gt 0 ]; then
  echo "✅ Found $TENANTS tenant(s)"
else
  echo "⚠️  No tenants found. Create one at http://localhost:3000"
fi

echo ""
echo "🎯 Test URLs:"
echo "  - Admin: http://localhost:3000"
echo "  - Client (shop1): http://shop1.localhost:3001"
echo "  - Client (shop2): http://shop2.localhost:3001"
```

## Expected Flow

```
1. Start API:        cd apps/api && yarn dev      → Port 3002
2. Start Admin:      cd apps/admin && yarn dev    → Port 3000  
3. Start Client:     cd apps/client && yarn dev   → Port 3001

4. Create Tenant:    http://localhost:3000        → Fill form
5. Access Tenant:    http://shop1.localhost:3001  → See dashboard
6. Add Product:      curl to API                  → Create product
7. View Product:     http://shop1.localhost:3001  → See product
```

## Success Criteria

✅ Client app loads with tenant name
✅ Subdomain routing works correctly
✅ Products display correctly
✅ Data isolation works (each tenant sees only their data)
✅ Invalid subdomains redirect to admin
✅ Root domain redirects to admin

## Next Steps

Sau khi test thành công:
1. ✅ Verify data isolation
2. ✅ Test với nhiều tenants
3. ✅ Add more products
4. ✅ Test error handling
5. ✅ Deploy to Railway

---

**Happy Testing!** 🚀
