# Admin Pages Pagination Review

## ✅ Pages với Standard Pattern (Đúng)

### Main Pages
1. **`/admin/app/merchants/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Pagination component
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

2. **`/admin/app/plans/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Pagination component (đã chuẩn hóa)
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

3. **`/admin/app/subscriptions/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ SubscriptionList có pagination prop
   - ✅ handlePageChange với updateURL

4. **`/admin/app/users/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Users component có pagination
   - ✅ handlePageChange với updateURL

5. **`/admin/app/orders/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Orders component có pagination
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

6. **`/admin/app/payments/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Pagination component (đã thay custom buttons)
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

### Merchant Detail Pages
7. **`/admin/app/merchants/[id]/users/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Users component có pagination
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

8. **`/admin/app/merchants/[id]/products/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Products component có pagination
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

9. **`/admin/app/merchants/[id]/outlets/page.tsx`** ✅
   - ✅ URL state pattern
   - ✅ Outlets component có pagination
   - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

10. **`/admin/app/merchants/[id]/orders/page.tsx`** ✅
    - ✅ URL state pattern
    - ✅ Orders component có pagination
    - ✅ handlePageChange với updateURL (đã sửa special handling cho page)

### Audit Logs Pages
11. **`/admin/app/audit-logs/page.tsx`** ✅
    - ✅ Uses usePagination hook
    - ✅ Pagination component
    - ⚠️ Không dùng URL state pattern (dùng local state) - OK cho audit logs

12. **`/admin/app/system/audit-logs/page.tsx`** ✅
    - ✅ Uses usePagination hook
    - ✅ Pagination component
    - ⚠️ Không dùng URL state pattern (dùng local state) - OK cho audit logs

## 📋 Tổng Kết

### Status
- ✅ **12 pages** đã đúng pattern (100%)
- ✅ **0 pages** cần sửa
- ✅ **2 audit logs pages** dùng usePagination hook (OK, không cần migrate)

### Pattern Checklist
- [x] URL state pattern (page, limit từ searchParams) - **100%** (trừ audit logs)
- [x] updateURL với special handling cho page - **100%**
- [x] handlePageChange callback - **100%**
- [x] Pagination component (không dùng custom buttons) - **100%**
- [x] Consistent spacing: `flex-shrink-0 py-4` - **100%**

### Standard Pattern Applied
Tất cả admin pages đã áp dụng pattern chuẩn:

```typescript
// ✅ URL params
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '25');

// ✅ updateURL với special handling cho page
const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams(searchParams.toString());
  
  Object.entries(updates).forEach(([key, value]) => {
    // Special handling for page: always set it, even if it's 1
    if (key === 'page') {
      const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
      if (pageNum > 0) {
        params.set(key, pageNum.toString());
      } else {
        params.delete(key);
      }
    } else if (value && value !== '' && value !== 'all') {
      params.set(key, value.toString());
    } else {
      params.delete(key);
    }
  });
  
  const newURL = `${pathname}?${params.toString()}`;
  router.push(newURL, { scroll: false });
}, [pathname, router, searchParams]);

// ✅ handlePageChange
const handlePageChange = useCallback((newPage: number) => {
  updateURL({ page: newPage });
}, [updateURL]);

// ✅ Pagination component
{data.items.length > 0 && totalItems > limit && (
  <div className="flex-shrink-0 py-4">
    <Pagination
      currentPage={data.currentPage || data.page || 1}
      totalPages={data.totalPages || Math.ceil(totalItems / limit)}
      total={totalItems}
      limit={limit}
      onPageChange={handlePageChange}
      itemName="items"
    />
  </div>
)}
```

### Changes Made
1. ✅ **Payments page**: Thay custom pagination buttons bằng Pagination component
2. ✅ **Payments page**: Sửa updateURL để có special handling cho page
3. ✅ **Orders page**: Sửa updateURL để có special handling cho page
4. ✅ **Merchant detail pages** (4 pages): Sửa updateURL để có special handling cho page
5. ✅ **Plans page**: Đã chuẩn hóa từ trước

### Notes
- **Audit logs pages** dùng `usePagination` hook với local state - OK vì có nhiều filters phức tạp
- **Tất cả list pages** đã có pagination và dùng pattern chuẩn
- **SubscriptionList** đã có pagination prop và render Pagination component
