# Phân tích cấu trúc Database cho Admin Requirements

## Yêu cầu Admin hiện tại

1. ✅ **View all tenants** - Đã có (Main DB)
2. ❌ **View all products của tenant** - Chưa có
3. ❌ **View orders của tenant** - Chưa có  
4. ❌ **View users của tenant** - Chưa có
5. ⚠️ **View subscriptions của tenant** - Có một phần (metadata trong Main DB, details trong Tenant DB)
6. ❌ **Gia hạn subscription** - Chưa có

## Cấu trúc Database hiện tại

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN DATABASE                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Tenant Table                                    │   │
│  │ - id, subdomain, name, email, phone, etc.       │   │
│  │ - subscriptionStatus, planId, trialEnd, etc.    │   │
│  │ - databaseUrl (connection string)              │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Plan Table                                      │   │
│  │ - id, name, basePrice, limits, features        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ databaseUrl
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ TENANT DB 1 │ │ TENANT DB 2 │ │ TENANT DB N │
│ (subdomain1)│ │ (subdomain2)│ │ (subdomainN)│
│             │ │             │ │             │
│ Products    │ │ Products    │ │ Products    │
│ Orders      │ │ Orders      │ │ Orders      │
│ Users       │ │ Users       │ │ Users       │
│ Subscriptions│ │ Subscriptions│ │ Subscriptions│
│ Customers   │ │ Customers   │ │ Customers   │
│ Outlets     │ │ Outlets     │ │ Outlets     │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Vấn đề với Admin Cross-Tenant Queries

### Hiện trạng
- **Main DB**: Chỉ có metadata (Tenant info, subscription status)
- **Tenant DBs**: Mỗi tenant có database riêng, isolated
- **Admin muốn**: Xem tất cả products/orders/users/subscriptions từ TẤT CẢ tenants

### Thách thức
1. **Performance**: Query từng tenant DB sẽ chậm với nhiều tenants
2. **Complexity**: Cần quản lý nhiều database connections
3. **Aggregation**: Khó aggregate data từ nhiều databases
4. **Pagination**: Khó paginate across multiple databases

## Giải pháp đề xuất

### Option 1: Query từng Tenant DB (Đơn giản, hiện tại có thể làm)

**Cách hoạt động:**
```typescript
// Admin query all products
async function getAllTenantProducts() {
  const tenants = await listAllTenants();
  const allProducts = [];
  
  for (const tenant of tenants) {
    const tenantDb = await getTenantDb(tenant.subdomain);
    const products = await tenantDb.product.findMany();
    allProducts.push(...products.map(p => ({ ...p, tenantId: tenant.id, tenantName: tenant.name })));
  }
  
  return allProducts;
}
```

**Ưu điểm:**
- ✅ Đơn giản, không cần thay đổi database
- ✅ Data luôn real-time
- ✅ Không cần sync

**Nhược điểm:**
- ❌ Chậm với nhiều tenants (N queries)
- ❌ Khó paginate
- ❌ Khó aggregate (sum, count, etc.)

### Option 2: Aggregated Views trong Main DB (Nhanh, cần sync)

**Cách hoạt động:**
```sql
-- Main DB có aggregated tables
CREATE TABLE admin_product_summary (
  tenant_id TEXT,
  product_count INT,
  active_products INT,
  total_stock INT,
  last_updated TIMESTAMP
);

-- Sync từ tenant DBs định kỳ hoặc real-time
```

**Ưu điểm:**
- ✅ Nhanh (single query)
- ✅ Dễ paginate và aggregate
- ✅ Performance tốt

**Nhược điểm:**
- ❌ Cần sync mechanism (có thể stale data)
- ❌ Tăng complexity
- ❌ Cần storage thêm

### Option 3: Admin API Endpoints với Tenant Filtering (Cân bằng - ĐỀ XUẤT)

**Cách hoạt động:**
```typescript
// Admin có thể query từng tenant cụ thể
GET /api/admin/tenants/{tenantId}/products
GET /api/admin/tenants/{tenantId}/orders
GET /api/admin/tenants/{tenantId}/users
GET /api/admin/tenants/{tenantId}/subscription

// Hoặc query tất cả với pagination thông minh
GET /api/admin/products?tenantIds=1,2,3&page=1&limit=20
```

**Ưu điểm:**
- ✅ Linh hoạt (query specific tenant hoặc all)
- ✅ Có thể paginate per tenant
- ✅ Không cần sync
- ✅ Real-time data

**Nhược điểm:**
- ⚠️ Có thể chậm với nhiều tenants (nhưng có thể optimize với parallel queries)

## Đánh giá: Cấu trúc hiện tại CÓ THỂ đáp ứng

### ✅ Có thể làm được:
1. **View all tenants** - ✅ Main DB đã có
2. **View products/orders/users của SPECIFIC tenant** - ✅ Có thể query tenant DB
3. **View subscription của tenant** - ✅ Metadata trong Main DB, details trong Tenant DB
4. **Gia hạn subscription** - ✅ Có thể update trong Tenant DB

### ⚠️ Cần implement:
1. **Admin API endpoints** để query từ tenant DBs
2. **Parallel queries** để optimize performance
3. **Caching** cho frequently accessed data
4. **Pagination** thông minh (per tenant hoặc aggregated)

### ❌ Khó khăn:
1. **View ALL products/orders/users từ TẤT CẢ tenants** - Cần query từng tenant DB (chậm với nhiều tenants)
2. **Aggregation** (tổng số products, orders, revenue) - Cần aggregate từ nhiều databases

## Đề xuất Implementation

### Phase 1: Admin API Endpoints (Ưu tiên cao)

Tạo các admin endpoints:
- `GET /api/admin/tenants/{tenantId}/products` - View products của tenant
- `GET /api/admin/tenants/{tenantId}/orders` - View orders của tenant
- `GET /api/admin/tenants/{tenantId}/users` - View users của tenant
- `GET /api/admin/tenants/{tenantId}/subscription` - View subscription của tenant
- `PUT /api/admin/tenants/{tenantId}/subscription/renew` - Gia hạn subscription

### Phase 2: Cross-Tenant Queries (Nếu cần)

Nếu admin cần view ALL products/orders/users từ tất cả tenants:
- Implement parallel queries với Promise.all
- Add caching layer
- Consider pagination per tenant

### Phase 3: Aggregated Data (Tùy chọn, nếu cần performance)

Nếu cần performance cao:
- Tạo aggregated tables trong Main DB
- Implement sync mechanism (real-time hoặc batch)

## Kết luận

**Cấu trúc database hiện tại CÓ THỂ đáp ứng yêu cầu admin**, nhưng cần:

1. ✅ **Implement admin API endpoints** để query từ tenant DBs
2. ✅ **Optimize queries** với parallel processing
3. ✅ **Add caching** cho frequently accessed data
4. ⚠️ **Consider aggregated views** nếu cần performance cao với nhiều tenants

**Recommendation**: Bắt đầu với Option 3 (Admin API Endpoints), sau đó optimize nếu cần.

