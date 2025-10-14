# 🔐 Platform Access Control

## Overview

Simple JWT-based platform access control that restricts which subscription plans can access which platforms (web/mobile).

**Business Logic:**
- **Basic Plan**: Mobile app only ❌ No web access
- **Premium/Enterprise Plans**: Both web and mobile ✅

---

## 🏗️ Architecture

### Simple & Centralized Approach

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Login     │───▶│  JWT Token   │───▶│ Middleware  │
│ (Add Plan)  │    │ (Plan Name)  │    │ (Check)     │
└─────────────┘    └──────────────┘    └─────────────┘
```

**Key Components:**

1. **Login API** - Adds plan name to JWT token
2. **JWT Token** - Contains plan name (no DB query needed)
3. **Middleware** - Simple check blocks Basic plan on web
4. **Platform Detector** - Identifies web vs mobile requests

---

## 📋 Implementation

### 1. JWT Token Structure

```typescript
// JWT Payload includes plan name
{
  userId: 123,
  email: "user@example.com",
  role: "MERCHANT",
  merchantId: 1,
  outletId: null,
  planName: "Basic" // ✅ Plan name for platform access
}
```

### 2. Login Flow

```typescript
// apps/api/app/api/auth/login/route.ts

// Get merchant's active subscription plan
let planName = 'Basic'; // Default
if (user.merchantId) {
  const merchant = await db.merchants.findById(user.merchantId);
  if (merchant?.subscription?.plan) {
    planName = merchant.subscription.plan.name; // "Basic", "Premium", "Enterprise"
  }
}

// Generate token with plan name
const token = generateToken({
  userId: user.id,
  email: user.email,
  role: user.role,
  merchantId: user.merchantId,
  outletId: user.outletId,
  planName // ✅ Include in JWT
});
```

### 3. Middleware Check (Simple!)

```typescript
// apps/api/middleware.ts

// Detect platform from headers
const platformInfo = detectPlatform(request); // 'web' or 'mobile'

// Simple check - only Basic plan is restricted on web
if (payload.role !== 'ADMIN' && platformInfo.platform === 'web') {
  const planName = payload.planName || 'Basic';
  
  if (planName === 'Basic') {
    return NextResponse.json({
      success: false,
      error: 'PLATFORM_ACCESS_DENIED',
      message: 'Basic plan only supports mobile app. Please upgrade to Premium or Enterprise.'
    }, { status: 403 });
  }
}
```

### 4. Platform Detection

```typescript
// apps/api/lib/platform-detector.ts

// Client sends custom headers
export function detectPlatform(request: Request): PlatformInfo {
  const platformHeader = request.headers.get('X-Client-Platform');
  
  if (platformHeader === 'mobile') {
    return { platform: 'mobile', ... };
  } else if (platformHeader === 'web') {
    return { platform: 'web', ... };
  }
  
  // Fallback to User-Agent
  return detectFromUserAgent(request.headers.get('User-Agent'));
}
```

---

## 🌐 Client Configuration

### Web Client (Next.js)

```typescript
// packages/utils/src/core/common.ts

const headers = {
  'Content-Type': 'application/json',
  'X-Client-Platform': 'web',      // ✅ Self-identify as web
  'X-App-Version': '1.0.0',
  'X-Device-Type': 'browser',
  'Authorization': `Bearer ${token}`
};
```

### Mobile Client (React Native)

```typescript
// mobile-app/src/api/client.ts

import { Platform } from 'react-native';

const headers = {
  'Content-Type': 'application/json',
  'X-Client-Platform': 'mobile',    // ✅ Self-identify as mobile
  'X-App-Version': '2.0.0',
  'X-Device-Type': Platform.OS,     // 'ios' or 'android'
  'Authorization': `Bearer ${token}`
};
```

---

## 🔑 Key Features

### ✅ Benefits

1. **Simple** - Just a few lines of code
2. **Fast** - No database queries (JWT check only)
3. **Centralized** - All logic in middleware
4. **Edge Compatible** - Works in Edge Runtime
5. **Secure** - Cannot bypass middleware check

### 🎯 Flow

```
1. User logs in
   ↓
2. Backend checks merchant's plan (DB query once)
   ↓
3. Plan name saved in JWT token
   ↓
4. Every API request:
   - Middleware reads plan from JWT (no DB query!)
   - Checks if platform allowed
   - Blocks or allows access
```

---

## 🚨 Error Responses

### Platform Access Denied

```json
{
  "success": false,
  "error": "PLATFORM_ACCESS_DENIED",
  "message": "Basic plan only supports mobile app. Please upgrade to Premium or Enterprise to access the web dashboard.",
  "details": {
    "currentPlan": "Basic",
    "currentPlatform": "web",
    "allowedPlatforms": ["mobile"],
    "upgradeRequired": true,
    "upgradeUrl": "/settings/subscription"
  }
}
```

**Status Code:** `403 Forbidden`

**Response Headers:**
```
X-Platform-Access-Denied: true
X-Upgrade-Required: true
```

---

## 📊 Plan Matrix

| Plan | Web Access | Mobile Access |
|------|------------|---------------|
| **Basic** | ❌ No | ✅ Yes |
| **Premium** | ✅ Yes | ✅ Yes |
| **Enterprise** | ✅ Yes | ✅ Yes |

---

## 🛠️ Extending the System

### Add New Plan Restrictions

```typescript
// apps/api/middleware.ts

if (payload.role !== 'ADMIN' && platformInfo.platform === 'web') {
  const planName = payload.planName || 'Basic';
  
  // Add more restrictions here
  if (planName === 'Basic' || planName === 'Starter') {
    return NextResponse.json({...}, { status: 403 });
  }
}
```

### Add More Platforms

```typescript
// packages/types/src/platform.ts

export type ClientPlatform = 'web' | 'mobile' | 'desktop' | 'tablet';

// Then update middleware accordingly
```

---

## 🧪 Testing

### Test Basic Plan on Web (Should Fail)

```bash
curl -X GET http://localhost:3002/api/orders \
  -H "Authorization: Bearer <basic-plan-token>" \
  -H "X-Client-Platform: web"

# Expected: 403 PLATFORM_ACCESS_DENIED
```

### Test Basic Plan on Mobile (Should Succeed)

```bash
curl -X GET http://localhost:3002/api/orders \
  -H "Authorization: Bearer <basic-plan-token>" \
  -H "X-Client-Platform: mobile"

# Expected: 200 OK
```

### Test Premium Plan on Web (Should Succeed)

```bash
curl -X GET http://localhost:3002/api/orders \
  -H "Authorization: Bearer <premium-plan-token>" \
  -H "X-Client-Platform: web"

# Expected: 200 OK
```

---

## 📝 Notes

### Security Considerations

1. **Headers can be faked** - Don't use for security-critical operations
2. **JWT is secure** - Plan name cannot be modified without invalidating token
3. **Middleware enforces** - Cannot bypass middleware check
4. **Admin bypass** - ADMIN users can access from any platform

### Performance

- ✅ **No database queries** - Plan name read from JWT
- ✅ **Fast check** - Simple string comparison
- ✅ **Edge Runtime compatible** - No Node.js dependencies
- ✅ **Scales well** - O(1) complexity

### Future Enhancements

1. **Plan upgrade prompt** - Show upgrade modal on web for Basic users
2. **Grace period** - Allow X days after plan expires
3. **Feature flags** - More granular control per plan
4. **Analytics** - Track blocked access attempts

---

## 🎉 Summary

**Simple, fast, and effective platform access control!**

- ✅ 5 lines of code in middleware
- ✅ Zero database queries per request
- ✅ Centralized in one place
- ✅ Works with any client (web/mobile/desktop)
- ✅ Easy to extend and maintain

**No complex wrapper functions needed!** 🚀

