# Centralized Logging Usage Guide

## 🎯 Overview

Với centralized logging, bạn **KHÔNG CẦN** thêm logging code vào từng route nữa. Tất cả được log tự động!

## 📝 Cách sử dụng

### Option 1: Sử dụng `withApiLogging` wrapper (Recommended)

```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { withPermissions } from '@rentalshop/auth';

// Wrap route với withApiLogging
export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user }) => {
    // Your code - NO logging needed!
    const posts = await db.posts.search(filters);
    return NextResponse.json(ResponseBuilder.success('POSTS_FOUND', posts));
  })
);
```

**Tự động log:**
- ✅ API request (method, path, status, duration)
- ✅ Errors với full context
- ✅ Slow requests (>1s)

### Option 2: Sử dụng `withAuthAndLogging` (Shortcut)

```typescript
import { withAuthAndLogging } from '@/lib/api-logging-wrapper';

// Combines auth + logging in one wrapper
export const GET = withAuthAndLogging(['posts.view'])(async (request, { user }) => {
  // Your code - NO logging needed!
  const posts = await db.posts.search(filters);
  return NextResponse.json(ResponseBuilder.success('POSTS_FOUND', posts));
});
```

### Option 3: Chỉ thêm custom logs cho business events quan trọng

```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { logInfo } from '@rentalshop/utils/server';

export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user }) => {
    const body = await request.json();
    const post = await db.posts.create({ ...body, authorId: user.id });
    
    // Chỉ log business event quan trọng
    logInfo('Post created', {
      postId: post.id,
      title: post.title,
      authorId: user.id,
    });
    
    return NextResponse.json(ResponseBuilder.success('POST_CREATED', post));
  })
);
```

## 🔄 Migration từ Manual Logging

### Before (Manual Logging):

```typescript
export const GET = withPermissions(['posts.view'])(async (request, { user }) => {
  const startTime = Date.now();
  try {
    const posts = await db.posts.search(filters);
    
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/posts', 200, duration, { userId: user.id });
    
    return NextResponse.json(ResponseBuilder.success('POSTS_FOUND', posts));
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching posts', error, {
      route: '/api/posts',
      method: 'GET',
      userId: user.id,
      duration,
    });
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
```

### After (Centralized Logging):

```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user }) => {
    // Tất cả logging đã được tự động!
    const posts = await db.posts.search(filters);
    return NextResponse.json(ResponseBuilder.success('POSTS_FOUND', posts));
  })
);
```

**Lợi ích:**
- ✅ Giảm code từ ~20 lines → ~5 lines
- ✅ Tự động log errors
- ✅ Tự động log API requests
- ✅ Consistent logging format

## 📊 What Gets Logged Automatically

### 1. API Requests
- Method (GET, POST, PUT, DELETE)
- Path (`/api/posts`)
- Status code (200, 400, 500, etc.)
- Duration (ms)
- Correlation ID
- User context (userId, merchantId, outletId)

### 2. Errors
- Error message
- Error stack trace
- Full request context
- Duration
- Correlation ID

### 3. Slow Requests
- Warning log cho requests >1s
- Method, path, duration

## 🎯 Best Practices

### ✅ DO: Chỉ log business events quan trọng

```typescript
// Good: Log important business events
logInfo('Post published', { postId, authorId });
logInfo('Payment processed', { orderId, amount });
logInfo('User created', { userId, email });
```

### ❌ DON'T: Log mọi thứ

```typescript
// Bad: Too verbose
logInfo('Fetching posts', { filters });
logInfo('Posts found', { count: posts.length });
logInfo('Returning response', { status: 200 });
```

### ✅ DO: Sử dụng wrapper cho tất cả routes

```typescript
// Good: Consistent logging
export const GET = withApiLogging(withPermissions([...])(handler));
export const POST = withApiLogging(withPermissions([...])(handler));
```

### ❌ DON'T: Mix manual và automatic logging

```typescript
// Bad: Duplicate logging
export const GET = withApiLogging(
  withPermissions([...])(async (request, { user }) => {
    const startTime = Date.now(); // ❌ Not needed
    logApiRequest(...); // ❌ Duplicate
    // ...
  })
);
```

## 🔍 Debugging

### View logs in development:

```bash
# File logs
tail -f logs/combined.log
tail -f logs/error.log

# Axiom (if configured)
# Visit https://app.axiom.co
```

### Search logs by correlation ID:

```typescript
// All logs for a request share the same correlation ID
// Search in Axiom: correlationId:req_20250131_abc123
```

## 📝 Examples

### Example 1: Simple GET route

```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { withPermissions } from '@rentalshop/auth';

export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user }) => {
    const posts = await db.posts.findAll();
    return NextResponse.json(ResponseBuilder.success('POSTS_FOUND', posts));
  })
);
```

### Example 2: POST with business event

```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';
import { logInfo } from '@rentalshop/utils/server';

export const POST = withApiLogging(
  withPermissions(['posts.manage'])(async (request, { user }) => {
    const body = await request.json();
    const post = await db.posts.create({ ...body, authorId: user.id });
    
    // Custom business log
    logInfo('Post created', { postId: post.id, title: post.title });
    
    return NextResponse.json(ResponseBuilder.success('POST_CREATED', post));
  })
);
```

### Example 3: Error handling (automatic)

```typescript
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const GET = withApiLogging(
  withPermissions(['posts.view'])(async (request, { user }) => {
    // If this throws, it's automatically logged with full context
    const post = await db.posts.findById(id);
    if (!post) {
      // This will be logged as 404
      return NextResponse.json(
        ResponseBuilder.error('POST_NOT_FOUND'),
        { status: 404 }
      );
    }
    return NextResponse.json(ResponseBuilder.success('POST_FOUND', post));
  })
);
```

## 🚀 Migration Checklist

- [ ] Import `withApiLogging` hoặc `withAuthAndLogging`
- [ ] Wrap route handlers với wrapper
- [ ] Remove manual `logApiRequest` calls
- [ ] Remove manual `logError` calls (keep only in special cases)
- [ ] Remove `startTime` tracking
- [ ] Keep only custom business logs (`logInfo` for important events)
- [ ] Test routes để verify logging works
