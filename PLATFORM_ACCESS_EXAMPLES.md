# 📱 Platform Access Control - Examples

## Quick Start Guide

### 1. Create Plans with Platform Restrictions

```sql
-- Basic Plan - Mobile only
UPDATE plans 
SET limits = jsonb_set(limits, '{allowWebAccess}', 'false')
WHERE name = 'Basic';

-- Premium Plan - Both platforms
UPDATE plans 
SET limits = jsonb_set(limits, '{allowWebAccess}', 'true')
WHERE name = 'Premium';
```

---

## 🧪 Testing Scenarios

### Scenario 1: Basic Plan User on Web (Blocked)

**Setup:**
```bash
# Login as Basic plan user
POST /api/auth/login
{
  "email": "basicuser@example.com",
  "password": "password123"
}

# Response includes token with planName: "Basic"
```

**Test:**
```bash
# Try to access web dashboard
GET /api/orders
Headers:
  Authorization: Bearer <token>
  X-Client-Platform: web
  
# ❌ Response: 403 Forbidden
{
  "success": false,
  "error": "PLATFORM_ACCESS_DENIED",
  "message": "Basic plan only supports mobile app. Please upgrade to Premium or Enterprise."
}
```

---

### Scenario 2: Basic Plan User on Mobile (Allowed)

**Test:**
```bash
# Access via mobile app
GET /api/orders
Headers:
  Authorization: Bearer <token>
  X-Client-Platform: mobile
  
# ✅ Response: 200 OK
{
  "success": true,
  "data": [...orders...]
}
```

---

### Scenario 3: Premium Plan User on Web (Allowed)

**Setup:**
```bash
# Login as Premium plan user
POST /api/auth/login
{
  "email": "premiumuser@example.com",
  "password": "password123"
}
```

**Test:**
```bash
# Access web dashboard
GET /api/orders
Headers:
  Authorization: Bearer <token>
  X-Client-Platform: web
  
# ✅ Response: 200 OK
{
  "success": true,
  "data": [...orders...]
}
```

---

### Scenario 4: Admin User (Always Allowed)

**Test:**
```bash
# Admin bypasses all platform restrictions
GET /api/orders
Headers:
  Authorization: Bearer <admin-token>
  X-Client-Platform: web  # or mobile - doesn't matter
  
# ✅ Response: 200 OK (regardless of platform)
```

---

## 🔧 Development Testing

### Test with cURL

```bash
# Basic plan on web (should fail)
curl -X GET http://localhost:3002/api/orders \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Client-Platform: web" \
  -H "Content-Type: application/json"

# Basic plan on mobile (should work)
curl -X GET http://localhost:3002/api/orders \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Client-Platform: mobile" \
  -H "Content-Type: application/json"
```

### Test with Postman

**Collection Variables:**
```json
{
  "api_url": "http://localhost:3002",
  "basic_token": "{{basic_user_token}}",
  "premium_token": "{{premium_user_token}}"
}
```

**Request Headers:**
```
X-Client-Platform: web
X-App-Version: 1.0.0
X-Device-Type: browser
Authorization: Bearer {{basic_token}}
```

---

## 💻 Frontend Implementation

### React (Web) - Handle Platform Restriction

```typescript
// Handle 403 Platform Access Denied
const handleApiCall = async () => {
  try {
    const response = await fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Client-Platform': 'web',
      }
    });
    
    if (response.status === 403) {
      const error = await response.json();
      
      if (error.error === 'PLATFORM_ACCESS_DENIED') {
        // Show upgrade modal
        showUpgradeModal({
          title: 'Upgrade Required',
          message: error.message,
          upgradeUrl: error.details?.upgradeUrl || '/settings/subscription'
        });
        return;
      }
    }
    
    const data = await response.json();
    // Handle success...
    
  } catch (error) {
    console.error('API call failed:', error);
  }
};
```

### React Native - Platform Auto-Detection

```typescript
import { Platform } from 'react-native';

const apiClient = {
  async request(endpoint: string) {
    return fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Client-Platform': 'mobile',      // Always mobile
        'X-Device-Type': Platform.OS,        // 'ios' or 'android'
        'X-App-Version': APP_VERSION,
      }
    });
  }
};
```

---

## 🎨 UI Components

### Upgrade Modal (React)

```tsx
import { Dialog } from '@rentalshop/ui';

function UpgradeRequiredModal({ isOpen, onClose, message, upgradeUrl }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🚀 Upgrade to Premium</DialogTitle>
        </DialogHeader>
        
        <DialogDescription>
          {message}
        </DialogDescription>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
          <Button 
            variant="primary" 
            onClick={() => router.push(upgradeUrl)}
          >
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Plan Badge (Show Current Plan)

```tsx
function PlanBadge({ planName }: { planName: string }) {
  const badgeStyles = {
    Basic: 'bg-gray-100 text-gray-800',
    Premium: 'bg-blue-100 text-blue-800',
    Enterprise: 'bg-purple-100 text-purple-800'
  };
  
  return (
    <Badge className={badgeStyles[planName]}>
      {planName} Plan
      {planName === 'Basic' && ' (Mobile Only)'}
    </Badge>
  );
}
```

---

## 📊 Analytics & Monitoring

### Track Blocked Attempts

```typescript
// In middleware after blocking
console.log('❌ PLATFORM_ACCESS_DENIED:', {
  userId: payload.userId,
  email: payload.email,
  planName: payload.planName,
  platform: platformInfo.platform,
  timestamp: new Date().toISOString(),
  endpoint: pathname
});

// Send to analytics
analytics.track('platform_access_denied', {
  userId: payload.userId,
  planName: payload.planName,
  platform: platformInfo.platform,
  endpoint: pathname
});
```

### Monitor Upgrade Conversions

```typescript
// Track when users upgrade after being blocked
analytics.track('plan_upgraded_after_block', {
  userId: user.id,
  fromPlan: 'Basic',
  toPlan: 'Premium',
  reason: 'web_access_needed'
});
```

---

## 🔄 Migration Guide

### Existing Users

If you already have users in production:

```sql
-- 1. Update existing Basic plan limits
UPDATE plans 
SET limits = jsonb_set(
  COALESCE(limits, '{}'::jsonb), 
  '{allowWebAccess}', 
  'false'::jsonb
)
WHERE name = 'Basic';

-- 2. Update Premium/Enterprise plans
UPDATE plans 
SET limits = jsonb_set(
  COALESCE(limits, '{}'::jsonb), 
  '{allowWebAccess}', 
  'true'::jsonb
)
WHERE name IN ('Premium', 'Enterprise');

-- 3. Verify
SELECT name, limits->>'allowWebAccess' as web_access 
FROM plans;
```

### Force Token Refresh

After deploying:

```typescript
// Option 1: Force all users to re-login (aggressive)
// Clear all sessions and require re-login

// Option 2: Graceful upgrade (recommended)
// Old tokens without planName default to 'Basic'
// Users will get new token on next login
```

---

## 🎯 Best Practices

### 1. Clear Communication

```typescript
// Always provide clear error messages
{
  "message": "Basic plan only supports mobile app. Please upgrade to Premium or Enterprise to access the web dashboard.",
  "details": {
    "currentPlan": "Basic",
    "upgradeUrl": "/settings/subscription",
    "upgradeRequired": true
  }
}
```

### 2. Graceful Degradation

```typescript
// If platform detection fails, allow access by default
const platformInfo = detectPlatform(request);
if (platformInfo.platform === 'unknown') {
  console.warn('Unable to detect platform, allowing access');
  return NextResponse.next();
}
```

### 3. Logging & Monitoring

```typescript
// Log all platform access decisions
console.log('Platform access check:', {
  decision: 'allowed' | 'denied',
  planName,
  platform,
  userId,
  endpoint
});
```

---

## 🚀 Production Checklist

- [ ] Plans configured with `allowWebAccess` field
- [ ] JWT includes `planName` in payload
- [ ] Middleware checks platform access
- [ ] Web client sends `X-Client-Platform: web` header
- [ ] Mobile client sends `X-Client-Platform: mobile` header
- [ ] Error messages are user-friendly
- [ ] Upgrade flow is implemented
- [ ] Analytics tracking is set up
- [ ] Tested with all plan types
- [ ] Tested on all platforms
- [ ] Documentation updated

---

## ❓ FAQ

### Q: What happens if JWT doesn't have planName?
**A:** Defaults to 'Basic' (most restrictive)

### Q: Can users fake the platform header?
**A:** Yes, but it doesn't matter - plan restriction is in JWT which cannot be faked

### Q: What if a user upgrades mid-session?
**A:** They need to re-login to get new JWT with updated plan

### Q: How to force token refresh?
**A:** Implement token refresh endpoint or require re-login

### Q: Can we add more platforms?
**A:** Yes, just update the `ClientPlatform` type and middleware logic

---

## 🎉 Success!

You now have a **simple, fast, and secure** platform access control system!

**Next Steps:**
1. Test with real users
2. Monitor blocked access attempts
3. Track upgrade conversions
4. Iterate based on data

**Questions?** Check `PLATFORM_ACCESS_CONTROL.md` for detailed documentation.

