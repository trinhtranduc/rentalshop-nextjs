# Logging Coverage Review

## 📋 Tổng quan

**Ngày review:** 2025-01-31  
**Branch:** `feature/ai-blog-integration`

## ❌ Vấn đề phát hiện

### 1. **Logger đã bị xóa** (CRITICAL)
- File `packages/utils/src/core/logger.ts` **KHÔNG TỒN TẠI**
- File `packages/utils/src/server.ts` **KHÔNG TỒN TẠI**
- Không có structured logging (logError, logInfo, logWarn, logDebug)
- Không có file logging (combined.log, error.log)
- Không có cloud logging (Axiom)

### 2. **Tất cả API routes dùng console.error** (WARNING)
- **19 API routes** trong `/api/posts/*` chỉ dùng `console.error`
- Không có structured logging với context
- Không có log levels (error, warn, info, debug)
- Không có correlation IDs trong logs
- Không có user context trong logs

### 3. **Request logging không được sử dụng** (WARNING)
- Có `logRequestResponse` trong `apps/api/lib/request-context.ts`
- Có `withRequestLogging` wrapper trong `apps/api/lib/route-wrapper.ts`
- **KHÔNG được sử dụng** trong bất kỳ API route nào

## 📊 Logging Coverage Analysis

### API Routes - Posts Module

| Route | Method | Logging Status | Issues |
|-------|--------|----------------|---------|
| `/api/posts` | GET | ❌ console.error only | No structured logging |
| `/api/posts` | POST | ❌ console.error only | No structured logging |
| `/api/posts/[id]` | GET | ❌ console.error only | No structured logging |
| `/api/posts/[id]` | PUT | ❌ console.error only | No structured logging |
| `/api/posts/[id]` | DELETE | ❌ console.error only | No structured logging |
| `/api/posts/categories` | GET | ❌ console.error only | No structured logging |
| `/api/posts/categories` | POST | ❌ console.error only | No structured logging |
| `/api/posts/categories/[id]` | GET | ❌ console.error only | No structured logging |
| `/api/posts/categories/[id]` | PUT | ❌ console.error only | No structured logging |
| `/api/posts/categories/[id]` | DELETE | ❌ console.error only | No structured logging |
| `/api/posts/tags` | GET | ❌ console.error only | No structured logging |
| `/api/posts/tags` | POST | ❌ console.error only | No structured logging |
| `/api/posts/tags/[id]` | GET | ❌ console.error only | No structured logging |
| `/api/posts/tags/[id]` | PUT | ❌ console.error only | No structured logging |
| `/api/posts/tags/[id]` | DELETE | ❌ console.error only | No structured logging |
| `/api/posts/public` | GET | ❌ console.error only | No structured logging |
| `/api/posts/slug/[slug]` | GET | ❌ console.error only | No structured logging |
| `/api/posts/categories/public` | GET | ❌ console.error only | No structured logging |
| `/api/posts/tags/public` | GET | ❌ console.error only | No structured logging |

**Total:** 19 routes, **0%** có structured logging

### Other API Routes

| Route | Logging Status | Notes |
|-------|----------------|-------|
| `/api/audit-logs` | ⚠️ console.log only | Có AuditLogger nhưng không dùng structured logging |
| `/api/request-logs` | ❌ No logging | Không có error logging |
| `/api/outlets` | ⚠️ console.log only | Có debug logs nhưng không structured |

## 🔍 Chi tiết vấn đề

### 1. **Thiếu Structured Logging**

**Hiện tại:**
```typescript
catch (error) {
  console.error('Error fetching posts:', error);
  const { response, statusCode } = handleApiError(error);
  return NextResponse.json(response, { status: statusCode });
}
```

**Nên có:**
```typescript
import { logError } from '@rentalshop/utils/server';

catch (error) {
  logError('Error fetching posts', error, {
    route: '/api/posts',
    method: 'GET',
    userId: user.id,
    userRole: user.role,
    filters: parsed.data
  });
  const { response, statusCode } = handleApiError(error);
  return NextResponse.json(response, { status: statusCode });
}
```

### 2. **Thiếu Success Logging**

**Hiện tại:**
```typescript
const post = await db.posts.create(postData);
return NextResponse.json(
  ResponseBuilder.success('POST_CREATED_SUCCESS', post),
  { status: 201 }
);
```

**Nên có:**
```typescript
import { logInfo } from '@rentalshop/utils/server';

const post = await db.posts.create(postData);
logInfo('Post created successfully', {
  postId: post.id,
  title: post.title,
  authorId: user.id,
  status: post.status
});
return NextResponse.json(
  ResponseBuilder.success('POST_CREATED_SUCCESS', post),
  { status: 201 }
);
```

### 3. **Thiếu Database Operation Logging**

**Nên có:**
```typescript
import { logDatabaseOperation } from '@rentalshop/utils/server';

const post = await db.posts.create(postData);
logDatabaseOperation('create', 'Post', Date.now() - startTime, {
  postId: post.id,
  authorId: user.id
});
```

### 4. **Thiếu API Request Logging**

**Nên có:**
```typescript
import { logApiRequest } from '@rentalshop/utils/server';

logApiRequest('GET', '/api/posts', 200, Date.now() - startTime, {
  userId: user.id,
  filters: parsed.data
});
```

## ✅ Khuyến nghị

### Priority 1: Tạo lại Logger (CRITICAL)

1. **Tạo logger với Pino + Axiom**
   - File: `packages/utils/src/core/logger.ts`
   - Export: `logError`, `logInfo`, `logWarn`, `logDebug`, `logApiRequest`, `logDatabaseOperation`
   - Server-only export: `packages/utils/src/server.ts`
   - File logging: `combined.log`, `error.log`
   - Cloud logging: Axiom (dev/prod datasets)

2. **Cấu hình Axiom**
   - Environment variables: `AXIOM_TOKEN`, `AXIOM_ORG_ID`, `AXIOM_DATASET`
   - Auto-detect environment: `anyrent-logs-dev` / `anyrent-logs-prod`

### Priority 2: Thêm Logging vào API Routes (HIGH)

1. **Posts API Routes**
   - Thêm `logError` trong tất cả catch blocks
   - Thêm `logInfo` cho successful operations (create, update, delete)
   - Thêm `logApiRequest` cho request/response logging
   - Thêm `logDatabaseOperation` cho database queries

2. **Categories & Tags API Routes**
   - Tương tự như Posts routes

### Priority 3: Sử dụng Request Logging Wrapper (MEDIUM)

1. **Wrap API routes với `withRequestLogging`**
   - Tự động log requests/responses
   - Capture correlation IDs
   - Log duration, status codes, errors

### Priority 4: Thêm Context vào Logs (LOW)

1. **User context**
   - userId, userRole, email
   - merchantId, outletId

2. **Request context**
   - correlationId
   - IP address
   - User agent
   - Request body (sanitized)

3. **Business context**
   - postId, categoryId, tagId
   - filters, pagination
   - operation type

## 📝 Implementation Checklist

### Phase 1: Setup Logger (CRITICAL)
- [ ] Tạo `packages/utils/src/core/logger.ts` với Pino
- [ ] Tạo `packages/utils/src/server.ts` cho server-only export
- [ ] Cấu hình file logging (combined.log, error.log)
- [ ] Cấu hình Axiom cloud logging
- [ ] Test logger trong development
- [ ] Test logger trong production

### Phase 2: Add Logging to Posts API (HIGH)
- [ ] `/api/posts` GET - Add logError, logInfo, logApiRequest
- [ ] `/api/posts` POST - Add logError, logInfo, logApiRequest, logDatabaseOperation
- [ ] `/api/posts/[id]` GET - Add logError, logInfo, logApiRequest
- [ ] `/api/posts/[id]` PUT - Add logError, logInfo, logApiRequest, logDatabaseOperation
- [ ] `/api/posts/[id]` DELETE - Add logError, logInfo, logApiRequest, logDatabaseOperation

### Phase 3: Add Logging to Categories & Tags API (HIGH)
- [ ] `/api/posts/categories` - Add logging to all methods
- [ ] `/api/posts/categories/[id]` - Add logging to all methods
- [ ] `/api/posts/tags` - Add logging to all methods
- [ ] `/api/posts/tags/[id]` - Add logging to all methods

### Phase 4: Add Logging to Public API (MEDIUM)
- [ ] `/api/posts/public` - Add logInfo for public access
- [ ] `/api/posts/slug/[slug]` - Add logInfo for public access
- [ ] `/api/posts/categories/public` - Add logInfo
- [ ] `/api/posts/tags/public` - Add logInfo

### Phase 5: Request Logging Wrapper (MEDIUM)
- [ ] Wrap all API routes với `withRequestLogging`
- [ ] Test request logging
- [ ] Verify correlation IDs

## 🎯 Kết luận

**Current Status:** ❌ **KHÔNG ĐẦY ĐỦ**

- **0%** API routes có structured logging
- **0%** có file logging
- **0%** có cloud logging (Axiom)
- **100%** dùng console.error (không structured)

**Required Actions:**
1. 🔴 **CRITICAL**: Tạo lại logger với Pino + Axiom
2. ⚠️ **HIGH**: Thêm logging vào tất cả API routes
3. ⚠️ **MEDIUM**: Sử dụng request logging wrapper
4. ⚠️ **LOW**: Thêm context vào logs

**Estimated Effort:**
- Phase 1 (Setup Logger): 2-3 hours
- Phase 2-4 (Add Logging): 4-6 hours
- Phase 5 (Request Wrapper): 1-2 hours
- **Total: 7-11 hours**
