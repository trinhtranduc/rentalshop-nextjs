# Single Session Implementation Summary

## ✅ Implementation Complete

Tính năng **Single Session Enforcement** đã được implement thành công!

## 🎯 Chức năng

**Chỉ cho phép một phiên đăng nhập duy nhất tại một thời điểm:**
- ✅ Khi user login lần 1 → Tạo session A, token A
- ✅ Khi user login lần 2 → Tạo session B, token B, **invalidate session A**
- ✅ Token A sẽ không còn hoạt động (bị expire ngay lập tức)
- ✅ Chỉ có token B (login mới nhất) mới hoạt động

## 📝 Files Changed

### 1. Database Schema
- `prisma/schema.prisma` - Added UserSession model
- `prisma/migrations/20251016000000_add_user_sessions/migration.sql` - Migration file

### 2. Auth Package (`packages/auth/`)
- `src/jwt.ts` - Added `sessionId` to JWT payload
- `src/core.ts` - Added session validation in `authenticateRequest()`

### 3. Database Package (`packages/database/`)
- `src/sessions.ts` - **NEW:** Session management functions
- `src/index.ts` - Export session functions

### 4. API Routes (`apps/api/`)
- `app/api/auth/login/route.ts` - Create session on login
- `app/api/auth/logout/route.ts` - Invalidate session on logout

### 5. Tests & Documentation
- `tests/single-session-test.js` - **NEW:** Test suite
- `DEPLOY_SINGLE_SESSION.md` - **NEW:** Deployment guide
- `scripts/apply-single-session-migration.sh` - **NEW:** Migration script

## 🔄 Flow Diagram

```
User Login Flow (Single Session Enforcement)
=============================================

1. User logs in on Device A
   ┌─────────────────────────────────────┐
   │ Login Request (email, password)      │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Validate credentials ✓               │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ INVALIDATE all previous sessions     │ ← Single session enforcement
   │ for this user                        │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Create NEW session (sessionId: ABC) │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Generate JWT with sessionId: ABC    │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Return token A to Device A          │
   └─────────────────────────────────────┘

2. User logs in on Device B (same account)
   ┌─────────────────────────────────────┐
   │ Login Request (email, password)      │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Validate credentials ✓               │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ INVALIDATE session ABC (Token A)    │ ← Single session enforcement
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Create NEW session (sessionId: XYZ) │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Generate JWT with sessionId: XYZ    │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Return token B to Device B          │
   └─────────────────────────────────────┘

3. Device A tries to make API request
   ┌─────────────────────────────────────┐
   │ API Request with Token A            │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Verify JWT token ✓                  │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Check session ABC validity          │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Session ABC is INVALIDATED ❌       │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Return 401 SESSION_EXPIRED          │
   └─────────────────────────────────────┘
```

## 🚀 Deploy to Railway

### Step 1: Commit Changes
```bash
git add -A
git commit -m "feat: implement single session enforcement

- Add UserSession model and migration
- Add sessionId to JWT payload
- Invalidate old sessions on new login
- Validate session on every API request
- Add logout session invalidation
- Add test suite for single session behavior"
```

### Step 2: Push to Railway
```bash
git push origin fix-railway  # or your Railway branch
```

Railway will automatically:
1. Deploy new code
2. Run Prisma migrations (create UserSession table)
3. Restart API service

### Step 3: Test After Deployment
```bash
# Wait for Railway deployment to complete (2-5 minutes)
# Then run test:
export API_URL="https://dev-apis-development.up.railway.app"
node tests/single-session-test.js
```

## 📊 Database Migration

The migration creates this table:

```sql
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidatedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");
CREATE INDEX "UserSession_userId_isActive_idx" ON "UserSession"("userId", "isActive");
CREATE INDEX "UserSession_sessionId_idx" ON "UserSession"("sessionId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## 🧪 Test Scenarios

Test script validates:
1. ✅ First login creates valid session
2. ✅ Second login invalidates first session
3. ✅ Old token cannot be used after new login
4. ✅ New token works correctly
5. ✅ Logout invalidates current session
6. ✅ Token cannot be used after logout

## 🔒 Security Benefits

1. **Prevent account sharing** - Only one active session per user
2. **Force re-login** - Old sessions immediately invalidated
3. **Better control** - Track and monitor all login sessions
4. **Immediate logout** - No need to wait for JWT expiration

## 📱 User Experience Impact

**Positive:**
- ✅ Better security - no concurrent sessions
- ✅ Clear session management
- ✅ Immediate logout takes effect

**Consideration:**
- ⚠️ User will be logged out from other devices when logging in somewhere new
- ⚠️ Need to communicate this behavior to users

## 🎯 Next Steps

1. [x] Implementation complete
2. [ ] Deploy to Railway
3. [ ] Run tests
4. [ ] Monitor production logs
5. [ ] Add user notification (optional) - "You've been logged out because you logged in from another device"

## 📞 Support

Issues? Check:
- Railway deployment logs
- Database migration applied: `SELECT COUNT(*) FROM "UserSession";`
- Session creation on login
- Session invalidation behavior

