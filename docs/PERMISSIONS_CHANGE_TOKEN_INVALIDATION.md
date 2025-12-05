# Permissions Change Token Invalidation

## Tổng quan

Hệ thống đã được cập nhật để **tự động invalidate token** khi user permissions thay đổi, tương tự như cơ chế invalidate token khi change password.

## Implementation

### 1. Database Schema

**File**: `prisma/schema.prisma`

Thêm field `permissionsChangedAt` vào User model:

```prisma
model User {
  // ... other fields
  passwordChangedAt      DateTime?
  permissionsChangedAt   DateTime?  // ✅ Timestamp when permissions were last changed (to invalidate old tokens)
  // ... other fields
}
```

### 2. Permissions API Update

**File**: `apps/api/app/api/users/[id]/permissions/route.ts`

Khi update permissions, tự động set `permissionsChangedAt`:

```typescript
// Update permissions using upsert
await Promise.all(permissionUpdates);

// ✅ Update permissionsChangedAt to invalidate old tokens
await prisma.user.update({
  where: { id: userId },
  data: {
    permissionsChangedAt: new Date(), // Invalidate all existing tokens
  },
});
```

### 3. JWT Payload Update

**File**: `packages/auth/src/jwt.ts`

Thêm `permissionsChangedAt` vào JWT payload:

```typescript
export interface JWTPayload {
  // ... other fields
  passwordChangedAt?: number | null;
  permissionsChangedAt?: number | null;  // ✅ Timestamp when permissions were last changed
}
```

### 4. Token Generation

**Files**: 
- `apps/api/app/api/auth/login/route.ts`
- `packages/auth/src/auth.ts`

Include `permissionsChangedAt` khi generate token:

```typescript
const permissionsChangedAt = (user as any).permissionsChangedAt
  ? Math.floor((user as any).permissionsChangedAt.getTime() / 1000)
  : null;

const token = generateToken({
  // ... other fields
  passwordChangedAt,
  permissionsChangedAt,  // ✅ Include in token
});
```

### 5. Token Validation

**File**: `packages/auth/src/core.ts`

Check `permissionsChangedAt` trong `authenticateRequest`:

```typescript
// ============================================================================
// PERMISSIONS CHANGE CHECK (Invalidate old tokens when permissions change)
// ============================================================================
const dbPermissionsChangedAt = (userRecord as any).permissionsChangedAt 
  ? Math.floor((userRecord as any).permissionsChangedAt.getTime() / 1000)
  : null;

const tokenPermissionsChangedAt = (user as any).permissionsChangedAt;

if (dbPermissionsChangedAt !== null) {
  const tolerance = 0.5; // 500ms tolerance for timing differences
  
  const isValid = tokenPermissionsChangedAt !== null && 
                  tokenPermissionsChangedAt !== undefined &&
                  tokenPermissionsChangedAt >= (dbPermissionsChangedAt - tolerance);
  
  if (!isValid) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          code: 'TOKEN_INVALIDATED', 
          message: 'Your session has expired due to permissions change. Please login again.' 
        },
        { status: 401 }
      )
    };
  }
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Admin changes user permissions                             │
└────────────────────┬────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  PUT /api/users/[id]/permissions                           │
│  - Update UserPermission records                           │
│  - Set permissionsChangedAt = new Date()                   │
└────────────────────┬────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  User makes API request with old token                     │
└────────────────────┬────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  authenticateRequest()                                      │
│  - Check permissionsChangedAt from DB vs Token             │
│  - If DB > Token: INVALIDATE TOKEN                         │
└────────────────────┬────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Return 401: TOKEN_INVALIDATED                             │
│  Message: "Your session has expired due to permissions     │
│            change. Please login again."                     │
└─────────────────────────────────────────────────────────────┘
```

## Security Benefits

1. **Immediate Effect**: Permissions changes take effect immediately
2. **No Stale Tokens**: Old tokens with outdated permissions are invalidated
3. **Consistent Behavior**: Same pattern as password change invalidation
4. **User Experience**: Clear error message prompts user to re-login

## Migration Required

⚠️ **Important**: Cần chạy migration để thêm field `permissionsChangedAt` vào database:

```bash
npx prisma migrate dev --name add_permissions_changed_at
```

## Testing

1. Login và lưu token
2. Admin change permissions của user
3. User sử dụng token cũ để call API
4. Expected: 401 error với message "Your session has expired due to permissions change"
5. User login lại với token mới
6. Expected: Token mới có permissions mới

