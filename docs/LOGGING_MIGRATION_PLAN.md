# Centralized Logging Migration Plan

## 📊 Tổng quan

**Ngày tạo:** 2025-01-31  
**Tổng số API routes:** 150 files  
**Tổng số route handlers:** ~225 handlers (GET, POST, PUT, DELETE, PATCH)

## 📈 Phân tích hiện trạng

### 1. Routes đã có structured logging (Manual)
- **Số lượng:** 2 files (posts routes)
- **Files:**
  - `apps/api/app/api/posts/route.ts` (GET, POST)
  - `apps/api/app/api/posts/[id]/route.ts` (GET, PUT, DELETE)
- **Status:** ✅ Đã có logging nhưng cần migrate sang centralized
- **Effort:** Medium (remove manual logs, wrap với `withApiLogging`)

### 2. Routes chỉ có console.error/log (No structured logging)
- **Số lượng:** ~120 files
- **Pattern:** Chỉ dùng `console.error`, `console.log`
- **Status:** ⚠️ Cần wrap với `withApiLogging`
- **Effort:** Low (chỉ cần wrap, không cần remove code)

### 3. Routes không có logging gì cả
- **Số lượng:** ~28 files
- **Pattern:** Public routes, health checks, test routes
- **Status:** ⚠️ Nên thêm logging cho monitoring
- **Effort:** Low (wrap với `withApiLogging`)

### 4. Routes có withPermissions/withAuthRoles (Easy to wrap)
- **Số lượng:** ~290 handlers
- **Pattern:** Đã có auth wrapper, dễ wrap thêm logging
- **Status:** ✅ Ready to wrap
- **Effort:** Very Low (chỉ cần wrap thêm `withApiLogging`)

## 🎯 Migration Strategy

### Phase 1: High Priority Routes (Week 1)
**Focus:** Core business operations

| Category | Files | Handlers | Priority | Effort |
|----------|-------|----------|----------|--------|
| **Posts** | 2 | 5 | 🔴 Critical | 2h |
| **Orders** | 5 | 8 | 🔴 Critical | 3h |
| **Products** | 3 | 5 | 🔴 Critical | 3h |
| **Users** | 4 | 7 | 🔴 Critical | 2h |
| **Customers** | 2 | 3 | 🔴 Critical | 1h |
| **Subscriptions** | 7 | 8 | ⚠️ High | 2h |
| **Total** | **23** | **36** | | **13h** |

### Phase 2: Medium Priority Routes (Week 2)
**Focus:** Supporting features

| Category | Files | Handlers | Priority | Effort |
|----------|-------|----------|----------|--------|
| **Analytics** | 10 | 10 | ⚠️ High | 2h |
| **Payments** | 3 | 3 | ⚠️ High | 1h |
| **Merchants** | 8 | 12 | ⚠️ High | 2h |
| **Settings** | 4 | 4 | ⚠️ Medium | 1h |
| **Outlets** | 1 | 2 | ⚠️ Medium | 0.5h |
| **Plans** | 3 | 5 | ⚠️ Medium | 1h |
| **Total** | **29** | **36** | | **7.5h** |

### Phase 3: Low Priority Routes (Week 3)
**Focus:** Utility and admin features

| Category | Files | Handlers | Priority | Effort |
|----------|-------|----------|----------|--------|
| **AI Features** | 2 | 2 | ⚠️ Medium | 0.5h |
| **Upload** | 2 | 2 | ⚠️ Medium | 0.5h |
| **Sync** | 5 | 5 | ⚠️ Low | 1h |
| **System** | 5 | 5 | ⚠️ Low | 1h |
| **Test/Debug** | 4 | 6 | ⚠️ Low | 0.5h |
| **Public** | 3 | 3 | ⚠️ Low | 0.5h |
| **Total** | **21** | **23** | | **4h** |

### Phase 4: Remaining Routes (Week 4)
**Focus:** Complete coverage

| Category | Files | Handlers | Priority | Effort |
|----------|-------|----------|----------|--------|
| **Remaining** | ~77 | ~130 | ⚠️ Low | 5h |
| **Total** | **77** | **130** | | **5h** |

## 📋 Detailed Migration Steps

### Step 1: Update Posts Routes (Example)

**Before:**
```typescript
export const GET = withPermissions(['posts.view'])(async (request, { user }) => {
  const startTime = Date.now();
  try {
    // ... code
    logApiRequest('GET', '/api/posts', 200, duration, {...});
  } catch (error) {
    logError('Error fetching posts', error, {...});
  }
});
```

**After:**
```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user }) => {
    // ... code (no logging needed)
  })
);
```

**Changes:**
1. Import `withApiLogging`
2. Wrap route với `withApiLogging`
3. Remove manual `logApiRequest`, `logError`, `startTime`
4. Keep only custom business logs (`logInfo` for important events)

### Step 2: Update Routes with console.error

**Before:**
```typescript
export const GET = withPermissions(['posts.view'])(async (request, { user }) => {
  try {
    // ... code
  } catch (error) {
    console.error('Error fetching posts:', error);
    // ...
  }
});
```

**After:**
```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user }) => {
    // ... code
    // console.error will be replaced by automatic error logging
  })
);
```

**Changes:**
1. Import `withApiLogging`
2. Wrap route với `withApiLogging`
3. Remove `console.error` (optional, can keep for now)

### Step 3: Update Routes without logging

**Before:**
```typescript
export const GET = async (request: NextRequest) => {
  // ... code
};
```

**After:**
```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const GET = withApiLogging(async (request: NextRequest) => {
  // ... code
});
```

**Changes:**
1. Import `withApiLogging`
2. Wrap route với `withApiLogging`

## 📊 Migration Statistics

### By Priority

| Priority | Files | Handlers | Effort | % of Total |
|----------|-------|----------|---------|------------|
| 🔴 Critical | 23 | 36 | 13h | 15% |
| ⚠️ High | 29 | 36 | 7.5h | 19% |
| ⚠️ Medium | 21 | 23 | 4h | 14% |
| ⚠️ Low | 77 | 130 | 5h | 51% |
| **Total** | **150** | **225** | **29.5h** | **100%** |

### By Effort Type

| Type | Count | Description |
|------|-------|-------------|
| **Wrap only** | ~200 | Chỉ cần wrap với `withApiLogging` |
| **Remove manual logs** | ~5 | Remove manual logging code |
| **Add custom logs** | ~20 | Thêm custom business logs |

## ⏱️ Time Estimation

### Conservative Estimate
- **Phase 1 (Critical):** 13 hours
- **Phase 2 (High):** 7.5 hours
- **Phase 3 (Medium):** 4 hours
- **Phase 4 (Low):** 5 hours
- **Testing & Review:** 5 hours
- **Total:** **34.5 hours** (~4-5 days)

### Optimistic Estimate (with automation)
- **Phase 1 (Critical):** 8 hours
- **Phase 2 (High):** 4 hours
- **Phase 3 (Medium):** 2 hours
- **Phase 4 (Low):** 2 hours
- **Testing & Review:** 3 hours
- **Total:** **19 hours** (~2-3 days)

## 🚀 Quick Wins (Can do immediately)

### 1. Posts Routes (Already done manually)
- ✅ Remove manual logging
- ✅ Wrap with `withApiLogging`
- **Time:** 30 minutes

### 2. Simple Routes (No auth, no logging)
- Wrap ~20 simple routes
- **Time:** 1 hour

### 3. Routes with withPermissions (Easy wrap)
- Wrap ~50 routes
- **Time:** 2 hours

**Total Quick Wins:** ~3.5 hours for ~70 routes

## 📝 Migration Checklist Template

For each route file:

- [ ] Import `withApiLogging` from `@/lib/api-logging-wrapper`
- [ ] Wrap route handler với `withApiLogging`
- [ ] Remove manual `logApiRequest` calls
- [ ] Remove manual `logError` calls (keep only in special cases)
- [ ] Remove `startTime` tracking
- [ ] Remove `console.error` (optional)
- [ ] Keep custom business logs (`logInfo` for important events)
- [ ] Test route to verify logging works
- [ ] Check logs in Axiom/file logs

## 🎯 Success Criteria

- [ ] **100% routes** wrapped with `withApiLogging`
- [ ] **Zero manual** `logApiRequest` calls
- [ ] **Zero manual** `logError` calls (except special cases)
- [ ] **All errors** automatically logged with context
- [ ] **All requests** automatically logged
- [ ] **Consistent** logging format across all routes
- [ ] **Custom business logs** only for important events

## 🔍 Testing Strategy

### 1. Unit Testing
- Test `withApiLogging` wrapper
- Verify error logging
- Verify request/response logging

### 2. Integration Testing
- Test wrapped routes
- Verify logs appear in files
- Verify logs appear in Axiom (if configured)

### 3. Manual Testing
- Test critical routes
- Check log format
- Verify correlation IDs

## 📈 Progress Tracking

### Week 1: Critical Routes
- [ ] Posts (2 files, 5 handlers)
- [ ] Orders (5 files, 8 handlers)
- [ ] Products (3 files, 5 handlers)
- [ ] Users (4 files, 7 handlers)
- [ ] Customers (2 files, 3 handlers)
- [ ] Subscriptions (7 files, 8 handlers)

### Week 2: High Priority Routes
- [ ] Analytics (10 files, 10 handlers)
- [ ] Payments (3 files, 3 handlers)
- [ ] Merchants (8 files, 12 handlers)
- [ ] Settings (4 files, 4 handlers)
- [ ] Outlets (1 file, 2 handlers)
- [ ] Plans (3 files, 5 handlers)

### Week 3: Medium Priority Routes
- [ ] AI Features (2 files, 2 handlers)
- [ ] Upload (2 files, 2 handlers)
- [ ] Sync (5 files, 5 handlers)
- [ ] System (5 files, 5 handlers)
- [ ] Test/Debug (4 files, 6 handlers)
- [ ] Public (3 files, 3 handlers)

### Week 4: Remaining Routes
- [ ] All remaining routes (~77 files, ~130 handlers)

## 💡 Recommendations

1. **Start with Quick Wins** - Wrap simple routes first
2. **Test as you go** - Verify logging works after each batch
3. **Keep custom logs** - Only for important business events
4. **Document patterns** - Share examples with team
5. **Automate if possible** - Use find/replace for simple cases

## 🎉 Expected Benefits

After migration:
- ✅ **Zero boilerplate** - No manual logging code
- ✅ **100% coverage** - All routes automatically logged
- ✅ **Consistent format** - Same structure everywhere
- ✅ **Easy maintenance** - Change logging in one place
- ✅ **Better debugging** - Correlation IDs, full context
- ✅ **Production ready** - File logs + Axiom cloud logging
