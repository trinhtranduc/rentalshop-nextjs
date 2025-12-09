# 🔧 Fix Production Client API Connection Error

## 🔍 Problem Identified

**Error in logs:**
```
Error: connect ECONNREFUSED ::1:3002
Error: connect ECONNREFUSED 127.0.0.1:3002
Failed to proxy http://localhost:3002/api/.env
```

**Root Cause:**
- Client production đang cố kết nối đến `localhost:3002` thay vì `https://api.anyrent.shop`
- `next.config.js` rewrite rule sử dụng `process.env.API_URL` (server-side env var)
- Trong production, `API_URL` không được set → fallback về `http://localhost:3002`

---

## ✅ Solution

### Option 1: Fix Rewrite Rule (Recommended)

**Problem:** Rewrite rule trong `next.config.js` dùng `process.env.API_URL` (server-side only)

**Fix:** Sử dụng `NEXT_PUBLIC_API_URL` hoặc loại bỏ rewrite rule

```javascript
// ❌ WRONG (current)
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.API_URL || 'http://localhost:3002'}/api/:path*`,
    },
  ];
}

// ✅ CORRECT (Option A: Use NEXT_PUBLIC_API_URL)
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  return [
    {
      source: '/api/:path*',
      destination: `${apiUrl}/api/:path*`,
    },
  ];
}

// ✅ CORRECT (Option B: Remove rewrite - client calls API directly)
// Remove rewrites() entirely - client app calls API URL directly from client-side
```

**Why Option B is better:**
- Client app nên gọi trực tiếp đến API URL từ client-side
- Không cần proxy qua Next.js server
- Đơn giản hơn và hiệu quả hơn

---

### Option 2: Set API_URL Environment Variable

**If keeping rewrite rule, set `API_URL` in Railway:**

```bash
railway variables --set API_URL='https://api.anyrent.shop' --service client --environment production
```

**But this is NOT recommended** because:
- `API_URL` là server-side env var
- Client app nên dùng `NEXT_PUBLIC_API_URL` (client-side accessible)

---

## 🎯 Recommended Fix

### Step 1: Remove Rewrite Rule

**File: `apps/client/next.config.js`**

```javascript
// Remove or comment out rewrites()
// async rewrites() {
//   return [
//     {
//       source: '/api/:path*',
//       destination: `${process.env.API_URL || 'http://localhost:3002'}/api/:path*`,
//     },
//   ];
// },
```

**Why:**
- Client app đã sử dụng `NEXT_PUBLIC_API_URL` từ `@rentalshop/utils` config
- API calls được thực hiện trực tiếp từ client-side
- Không cần proxy qua Next.js server

---

### Step 2: Verify Environment Variables

**Ensure `NEXT_PUBLIC_API_URL` is set in Railway:**

```bash
# Check current variables
railway variables --service client --environment production

# Set if missing
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service client --environment production
railway variables --set NEXT_PUBLIC_APP_ENV=production --service client --environment production
```

---

### Step 3: Redeploy

```bash
# Force redeploy after fix
railway up --service client --environment production

# Or push to git (Railway auto-deploys)
git add apps/client/next.config.js
git commit -m "fix: remove API rewrite rule - client calls API directly"
git push origin main
```

---

## 🔍 Verification

**After fix, check logs:**

```bash
railway logs --service client --environment production --tail
```

**Expected:**
- ✅ No more `ECONNREFUSED localhost:3002` errors
- ✅ API calls go directly to `https://api.anyrent.shop`
- ✅ Login page works correctly

**Test:**
```bash
curl https://anyrent.shop/login
# Expected: HTTP 200 with HTML content
```

---

## 📋 Summary

**Problem:**
- Rewrite rule dùng `process.env.API_URL` (server-side, không có trong production)
- Fallback về `localhost:3002` → Connection refused

**Solution:**
1. **Remove rewrite rule** (client calls API directly)
2. **Verify `NEXT_PUBLIC_API_URL`** is set correctly
3. **Redeploy** client service

**Why this works:**
- Client app đã có `NEXT_PUBLIC_API_URL` config từ `@rentalshop/utils`
- API calls được thực hiện từ client-side (browser)
- Không cần proxy qua Next.js server

