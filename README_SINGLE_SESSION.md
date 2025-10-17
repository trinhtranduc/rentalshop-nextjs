# ✨ Single Session Implementation - Complete

## 🎯 Tổng Quan

**Tính năng**: Chỉ cho phép một phiên đăng nhập duy nhất tại một thời điểm

**Cách hoạt động**:
- Khi user login lần 1 → Tạo session A với token A
- Khi user login lần 2 → Tạo session B với token B, **tự động vô hiệu hóa session A**
- Token A sẽ không còn hoạt động (bị expire ngay lập tức)
- Chỉ có token B (login mới nhất) mới hoạt động

## 📊 Trạng Thái Hiện Tại

| Component | Status | Note |
|-----------|--------|------|
| Code Implementation | ✅ DONE | All code completed |
| Database Schema | ✅ DONE | UserSession model added |
| Migration File | ✅ DONE | 20251016000000_add_user_sessions |
| Test Suite | ✅ DONE | Comprehensive tests ready |
| Documentation | ✅ DONE | Full docs created |
| Git Commit | ✅ DONE | Committed & pushed |
| Railway Deployment | ✅ DONE | Code deployed |
| **Migration Applied** | ⏸️ **PENDING** | **Needs manual action** |
| Test Validation | ⏳ WAITING | After migration |

## 🚨 ACTION REQUIRED

**Migration chưa được apply lên Railway database!**

👉 **Xem file**: [`APPLY_MIGRATION_NOW.md`](./APPLY_MIGRATION_NOW.md)

**Quick steps:**
1. Lấy `DATABASE_URL` từ Railway dashboard
2. Run: `export DATABASE_URL="postgresql://..."`
3. Run: `npx prisma migrate deploy`
4. Test: `./scripts/quick-migration-check.sh`

## 📁 Files Created/Modified

### New Files
```
prisma/migrations/20251016000000_add_user_sessions/
  └── migration.sql                          # PostgreSQL migration

packages/database/src/
  └── sessions.ts                            # Session management functions

tests/
  └── single-session-test.js                 # Test suite

scripts/
  ├── apply-single-session-migration.sh     # Migration helper
  └── quick-migration-check.sh              # Status checker

Documentation/
  ├── SINGLE_SESSION_SUMMARY.md             # Technical summary
  ├── DEPLOY_SINGLE_SESSION.md              # Deployment guide
  ├── APPLY_MIGRATION_NOW.md                # Migration instructions
  └── README_SINGLE_SESSION.md              # This file
```

### Modified Files
```
prisma/schema.prisma                         # Added UserSession model
packages/auth/src/jwt.ts                     # Added sessionId to JWT
packages/auth/src/core.ts                    # Added session validation
packages/database/src/index.ts               # Export sessions
apps/api/app/api/auth/login/route.ts        # Create session on login
apps/api/app/api/auth/logout/route.ts       # Invalidate session on logout
```

## 🔄 Implementation Flow

### 1. Login Flow
```
User Login
    ↓
Validate credentials ✓
    ↓
Query existing sessions
    ↓
INVALIDATE all previous sessions ← Single session enforcement
    ↓
Create NEW session (unique sessionId)
    ↓
Generate JWT with sessionId
    ↓
Return token to user
```

### 2. API Request Flow
```
API Request with token
    ↓
Verify JWT token ✓
    ↓
Extract sessionId from JWT
    ↓
Check if session is still valid
    ↓
├─ Valid → Allow request
└─ Invalid → Return 401 SESSION_EXPIRED
```

### 3. Logout Flow
```
Logout Request
    ↓
Verify JWT token ✓
    ↓
Extract sessionId
    ↓
Invalidate session in database
    ↓
Return success
```

## 🧪 Test Scenarios

Test suite validates 7 scenarios:

1. ✅ **First login** - Creates valid session
2. ✅ **Token A works** - Session 1 is active
3. ✅ **Second login** - Creates new session
4. ✅ **Token A invalid** - Session 1 invalidated by session 2
5. ✅ **Token B works** - Session 2 is active
6. ✅ **Logout** - Invalidates session 2
7. ✅ **Token B invalid** - After logout

**Run test:**
```bash
API_URL="https://dev-apis-development.up.railway.app" \
  node tests/single-session-test.js
```

## 🔐 Security Benefits

1. **Ngăn chặn concurrent sessions**
   - User chỉ có thể login từ 1 device/browser tại một thời điểm
   - Sessions cũ tự động bị vô hiệu hóa

2. **Immediate session termination**
   - Login mới → vô hiệu hóa tất cả sessions cũ
   - Logout → vô hiệu hóa session ngay lập tức
   - Không cần đợi JWT hết hạn

3. **Better security control**
   - Track tất cả login sessions
   - Biết khi nào và ở đâu user đã login
   - Monitor active sessions

## 📱 User Experience

**Scenario: User login trên Device A, sau đó login trên Device B**

```
Device A: User login
  → Session 1 created ✅
  → Token A issued ✅

Device B: User login (same account)
  → Session 2 created ✅
  → Token B issued ✅
  → Session 1 invalidated ❌ (Token A no longer works)

Device A: User makes API request
  → Gets SESSION_EXPIRED error ❌
  → Redirected to login page 🔄
```

## 🛠️ Database Schema

**New Table: UserSession**
```sql
CREATE TABLE "UserSession" (
    id              SERIAL PRIMARY KEY,
    userId          INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    sessionId       TEXT UNIQUE NOT NULL,
    ipAddress       TEXT,
    userAgent       TEXT,
    isActive        BOOLEAN DEFAULT true,
    createdAt       TIMESTAMP DEFAULT NOW(),
    expiresAt       TIMESTAMP NOT NULL,
    invalidatedAt   TIMESTAMP
);

-- Indexes for performance
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");
CREATE INDEX "UserSession_userId_isActive_idx" ON "UserSession"("userId", "isActive");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
```

## 📊 API Changes

### JWT Payload (BEFORE)
```typescript
{
  userId: 123,
  email: "user@example.com",
  role: "ADMIN",
  merchantId: 1,
  outletId: null,
  planName: "Premium"
}
```

### JWT Payload (AFTER)
```typescript
{
  userId: 123,
  email: "user@example.com",
  role: "ADMIN",
  merchantId: 1,
  outletId: null,
  planName: "Premium",
  sessionId: "abc123xyz..." // ← NEW: Session tracking
}
```

## 🔍 Monitoring & Maintenance

### Check Active Sessions
```sql
-- Count active sessions per user
SELECT "userId", COUNT(*) as active_sessions
FROM "UserSession"
WHERE "isActive" = true AND "expiresAt" > NOW()
GROUP BY "userId"
ORDER BY active_sessions DESC;

-- View all active sessions
SELECT 
  u.email,
  s."sessionId",
  s."createdAt",
  s."expiresAt",
  s."ipAddress"
FROM "UserSession" s
JOIN "User" u ON u.id = s."userId"
WHERE s."isActive" = true
ORDER BY s."createdAt" DESC;
```

### Cleanup Expired Sessions (Optional)
```typescript
// Run daily via cron job
import { db } from '@rentalshop/database';

const count = await db.sessions.cleanupExpiredSessions();
console.log(`Cleaned up ${count} expired sessions`);
```

## ✅ Next Steps

### Immediate (Required)
- [ ] **Apply migration** to Railway database
- [ ] **Run tests** to validate implementation
- [ ] **Monitor logs** for session-related events

### Short-term (Recommended)
- [ ] Add user notification: "Logged out from other devices"
- [ ] Add session management UI (view/revoke sessions)
- [ ] Set up monitoring alerts for failed sessions

### Long-term (Optional)
- [ ] Add "Remember this device" option
- [ ] Allow multiple sessions (configurable per user/plan)
- [ ] Add session activity logs

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "UserSession does not exist"
- **Solution**: Apply migration (see APPLY_MIGRATION_NOW.md)

**Issue**: "Token still works after new login"
- **Solution**: Check session invalidation logic in database

**Issue**: "All tokens expired"
- **Solution**: Check database connection and session creation

### Check Status
```bash
# Quick health check
./scripts/quick-migration-check.sh

# Full test suite
API_URL="https://dev-apis-development.up.railway.app" \
  node tests/single-session-test.js
```

## 🎉 Success Criteria

Implementation is successful when:
- ✅ Migration applied without errors
- ✅ Login creates new session
- ✅ New login invalidates old sessions
- ✅ Old tokens return SESSION_EXPIRED
- ✅ Logout invalidates current session
- ✅ All 7 test scenarios pass

## 📚 Documentation

- **Technical Summary**: [`SINGLE_SESSION_SUMMARY.md`](./SINGLE_SESSION_SUMMARY.md)
- **Deployment Guide**: [`DEPLOY_SINGLE_SESSION.md`](./DEPLOY_SINGLE_SESSION.md)
- **Migration Instructions**: [`APPLY_MIGRATION_NOW.md`](./APPLY_MIGRATION_NOW.md)
- **This README**: [`README_SINGLE_SESSION.md`](./README_SINGLE_SESSION.md)

---

**Implementation Date**: October 17, 2025  
**Status**: Code Complete, Migration Pending  
**Next Action**: Apply migration to Railway database

