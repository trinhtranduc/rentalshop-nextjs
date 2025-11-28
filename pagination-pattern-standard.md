# Pagination Pattern Standard

## ✅ Standard Pattern (Recommended)

### 1. URL State Pattern (Client & Admin Pages)

```typescript
// ✅ URL params as single source of truth
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '25');

// ✅ Update URL helper
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

// ✅ Page change handler
const handlePageChange = useCallback((newPage: number) => {
  updateURL({ page: newPage });
}, [updateURL]);

// ✅ Filters with pagination
const filters = useMemo(() => ({
  page,
  limit,
  // ... other filters
}), [page, limit, /* other deps */]);

// ✅ Data fetching
const { data, loading, error } = useDataHook({ filters });

// ✅ Pass to component
<Component
  data={data}
  onPageChange={handlePageChange}
/>
```

### 2. Component Pattern

```typescript
// ✅ In feature component (e.g., Products, Orders, Customers)
{data.items.length > 0 && totalItems > limit && (
  <div className="flex-shrink-0 py-4">
    <Pagination
      currentPage={data.currentPage || data.page || 1}
      totalPages={data.totalPages || Math.ceil(totalItems / limit)}
      total={totalItems}
      limit={limit}
      onPageChange={onPageChange}
      itemName="items"
    />
  </div>
)}
```

### 3. List Component Pattern (e.g., SubscriptionList)

```typescript
interface ListProps {
  items: Item[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

// ✅ Render pagination
{pagination && items.length > 0 && pagination.total > pagination.limit && (
  <div className="flex-shrink-0 py-4">
    <Pagination
      currentPage={pagination.page}
      totalPages={Math.ceil(pagination.total / pagination.limit)}
      total={pagination.total}
      limit={pagination.limit}
      onPageChange={pagination.onPageChange}
      itemName="items"
    />
  </div>
)}
```

## 📋 Pages Status

### ✅ Pages with Standard Pagination

**Client Pages:**
- ✅ `/client/app/products/page.tsx` - Uses Products component with pagination
- ✅ `/client/app/orders/page.tsx` - Uses Orders component with pagination
- ✅ `/client/app/customers/page.tsx` - Uses Customers component with pagination
- ✅ `/client/app/users/page.tsx` - Uses Users component with pagination
- ✅ `/client/app/categories/page.tsx` - Has pagination
- ✅ `/client/app/outlets/page.tsx` - Has pagination

**Admin Pages:**
- ✅ `/admin/app/merchants/page.tsx` - Uses Merchants component with pagination
- ✅ `/admin/app/users/page.tsx` - Uses Users component with pagination
- ✅ `/admin/app/orders/page.tsx` - Uses Orders component with pagination
- ✅ `/admin/app/subscriptions/page.tsx` - Uses SubscriptionList with pagination ✅
- ✅ `/admin/app/audit-logs/page.tsx` - Uses Pagination component
- ✅ `/admin/app/system/audit-logs/page.tsx` - Uses Pagination component

**Merchant Detail Pages:**
- ✅ `/admin/app/merchants/[id]/users/page.tsx` - Has pagination
- ✅ `/admin/app/merchants/[id]/products/page.tsx` - Has pagination
- ✅ `/admin/app/merchants/[id]/outlets/page.tsx` - Has pagination
- ✅ `/admin/app/merchants/[id]/orders/page.tsx` - Has pagination

### ⚠️ Pages with Custom Pagination (Need Standardization)

- ⚠️ `/admin/app/plans/page.tsx` - Uses custom pagination buttons, should use Pagination component

### ❌ Pages Missing Pagination

- ❌ None found - All list pages have pagination

## 🔧 Standardization Checklist

- [x] URL state pattern for all pages
- [x] Standard Pagination component usage
- [x] Consistent handlePageChange pattern
- [x] SubscriptionList has pagination ✅
- [ ] Plans page should use standard Pagination component

## 📝 Notes

1. **Always use URL params** as single source of truth for pagination
2. **Always use Pagination component** from `@rentalshop/ui` (not custom buttons)
3. **Always reset to page 1** when filters/search change
4. **Always show pagination** when `total > limit` and `items.length > 0`
5. **Always use consistent spacing**: `flex-shrink-0 py-4` for pagination container

