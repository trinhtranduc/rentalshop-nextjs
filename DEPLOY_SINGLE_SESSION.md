# Deploy Single Session Implementation to Railway

## 📋 Overview

This implementation adds **single session enforcement** to the authentication system:
- ✅ Only the latest login session is valid
- ✅ Previous sessions are automatically invalidated when user logs in again
- ✅ Session is invalidated on logout
- ✅ Token verification checks session validity

## 🚀 Deployment Steps

### Option 1: Automatic Deployment (Recommended)

1. **Commit and push changes to Railway:**
   ```bash
   git add .
   git commit -m "feat: implement single session enforcement"
   git push origin main  # or your Railway branch
   ```

2. **Railway will automatically:**
   - Deploy the new code
   - Run migrations (including UserSession table creation)
   - Restart the API service

3. **Wait for deployment to complete** (usually 2-5 minutes)

### Option 2: Manual Migration

If you need to apply the migration manually:

1. **Get your Railway DATABASE_URL:**
   - Go to Railway dashboard
   - Select your project
   - Go to PostgreSQL service
   - Copy the `DATABASE_URL` variable

2. **Apply migration:**
   ```bash
   export DATABASE_URL="postgresql://..."  # Your Railway DATABASE_URL
   ./scripts/apply-single-session-migration.sh
   ```

3. **Restart Railway API service** from the Railway dashboard

## ✅ Testing

After deployment, run the test suite:

```bash
# Test against Railway API
export API_URL="https://dev-apis-development.up.railway.app"
node tests/single-session-test.js
```

Expected output:
```
========================================
  SINGLE SESSION TEST
========================================

[Step 1] First login - Creating session 1
✅ First login successful - Token A: ...

[Step 2] Verify token A works (session 1 is active)
✅ Token A is valid ✓

[Step 3] Second login - Creating session 2 (should invalidate session 1)
✅ Second login successful - Token B: ...

[Step 4] Verify token A is now INVALID (session 1 should be invalidated)
✅ Token A is now invalid ✓ (SESSION_EXPIRED)
✨ Single session enforcement working correctly!

[Step 5] Verify token B still works (session 2 is active)
✅ Token B is valid ✓

[Step 6] Logout with token B (invalidate session 2)
✅ Logout successful ✓

[Step 7] Verify token B is now INVALID (after logout)
✅ Token B is now invalid after logout ✓

========================================
  TEST SUMMARY
========================================

✅ All tests PASSED! ✨
```

## 📊 What Changed

### 1. Database Schema
**New table: `UserSession`**
```sql
CREATE TABLE "UserSession" (
  id              SERIAL PRIMARY KEY,
  userId          INTEGER NOT NULL,
  sessionId       TEXT UNIQUE NOT NULL,
  ipAddress       TEXT,
  userAgent       TEXT,
  isActive        BOOLEAN DEFAULT true,
  createdAt       TIMESTAMP DEFAULT NOW(),
  expiresAt       TIMESTAMP NOT NULL,
  invalidatedAt   TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);
```

### 2. JWT Payload
**Added `sessionId` field:**
```typescript
interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  merchantId?: number;
  outletId?: number;
  planName?: string;
  sessionId?: string;  // ✨ NEW: for single session enforcement
}
```

### 3. Login Flow
**On login:**
1. Generate unique `sessionId`
2. **Invalidate ALL previous sessions** for this user
3. Create new session record
4. Include `sessionId` in JWT token

### 4. Token Verification
**On every API request:**
1. Verify JWT token
2. **Check if session is still valid** (not invalidated)
3. If session is invalid → return 401 `SESSION_EXPIRED`
4. If session is valid → allow request

### 5. Logout Flow
**On logout:**
1. Extract `sessionId` from JWT
2. **Invalidate the session** in database
3. Return success

## 🔐 Security Benefits

1. **Prevents concurrent sessions:**
   - User can only be logged in from one device/browser at a time
   - Old sessions are automatically invalidated

2. **Immediate session termination:**
   - New login invalidates all previous sessions
   - Logout immediately invalidates the session
   - No need to wait for JWT expiration

3. **Better security control:**
   - Track all login sessions
   - Know when and where users logged in
   - Monitor active sessions

## 📱 User Experience

**Scenario: User logs in on Device A, then Device B**

1. **Device A:** User logs in
   - ✅ Session 1 created
   - ✅ Token A issued

2. **Device B:** Same user logs in
   - ✅ Session 2 created
   - ✅ Token B issued
   - ❌ Session 1 invalidated (Token A no longer works)

3. **Device A:** User tries to make request
   - ❌ Gets `SESSION_EXPIRED` error
   - 🔄 User redirected to login page

## 🛠️ Monitoring

### Check active sessions for a user:
```sql
SELECT * FROM "UserSession" 
WHERE "userId" = 123 
  AND "isActive" = true 
  AND "expiresAt" > NOW();
```

### Clean up expired sessions (optional background job):
```typescript
import { db } from '@rentalshop/database';

// Run periodically (e.g., daily cron job)
const count = await db.sessions.cleanupExpiredSessions();
console.log(`Cleaned up ${count} expired sessions`);
```

## 🔄 Rollback Plan

If you need to rollback:

1. **Revert code changes:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Remove UserSession table (optional):**
   ```sql
   DROP TABLE "UserSession";
   ```

## 📞 Support

If you encounter issues:
1. Check Railway logs for errors
2. Verify migration was applied: `SELECT * FROM "UserSession" LIMIT 1;`
3. Run test script to validate behavior
4. Check session records in database

## ✨ Next Steps

After successful deployment:
- [ ] Run test suite
- [ ] Test with real user login scenarios
- [ ] Monitor session creation/invalidation in logs
- [ ] Set up monitoring alerts for session-related errors
- [ ] Document user experience for support team

