# 🔧 Fix Production Client Issue (anyrent.shop/login not working)

## 🔍 Problem

- ✅ `dev.anyrent.shop/login` - Works (HTTP 200)
- ❌ `anyrent.shop/login` - Not Found (HTTP 404)

## 🎯 Root Causes

1. **Client service not deployed** on production
2. **Environment variables missing** on production client service
3. **Build failed** during deployment
4. **Service not running** or crashed

---

## ✅ Step-by-Step Fix

### Step 1: Check Railway Production Client Service

```bash
# Check if client service exists in production
railway status --service client --environment production

# Or check via Railway Dashboard:
# https://railway.app/project/[your-project]/services
```

**Expected:**
- Service name: `client` (production)
- Status: Running ✅
- Domain: `anyrent.shop`

**If service doesn't exist:**
- Create new service from `apps/client` directory
- Set environment to `production`
- Link to production database

---

### Step 2: Verify Environment Variables

**Required for Production Client:**

```bash
# Check current variables
railway variables --service client --environment production

# Set required variables
railway variables --set NODE_ENV=production --service client --environment production
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service client --environment production
railway variables --set NEXT_PUBLIC_APP_ENV=production --service client --environment production
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service client --environment production
railway variables --set NEXTAUTH_URL='https://anyrent.shop' --service client --environment production
```

**Critical Variables:**
- ✅ `NODE_ENV=production`
- ✅ `NEXT_PUBLIC_API_URL=https://api.anyrent.shop`
- ✅ `NEXT_PUBLIC_APP_ENV=production` (for environment detection)
- ✅ `NEXTAUTH_SECRET` (must match API service)
- ✅ `NEXTAUTH_URL=https://anyrent.shop`

---

### Step 3: Check Build Logs

```bash
# View recent deployment logs
railway logs --service client --environment production

# Check for build errors:
# - "Build failed"
# - "Error: Cannot find module"
# - "Prisma Client not generated"
```

**Common Build Issues:**

1. **Prisma Client not generated:**
   ```bash
   # Fix: Add to build command
   npx prisma generate --schema=../../prisma/schema.prisma && yarn build
   ```

2. **Missing environment variables:**
   - Set `NEXT_PUBLIC_API_URL` before build
   - Railway needs these at build time (not runtime)

3. **Dockerfile build args:**
   ```dockerfile
   ARG NEXT_PUBLIC_API_URL
   ARG NEXT_PUBLIC_APP_ENV
   ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
   ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
   ```

---

### Step 4: Verify Service is Running

```bash
# Check service status
railway status --service client --environment production

# Check health endpoint
curl https://anyrent.shop/

# Expected: HTML response (not 404)
```

**If service is not running:**
- Check Railway Dashboard → Service → Logs
- Look for startup errors
- Verify start command: `cd apps/client && ../../node_modules/.bin/next start -p 3000`

---

### Step 5: Check Custom Domain Configuration

```bash
# Verify domain is linked
railway domain --service client --environment production

# Expected output:
# Domain: anyrent.shop
# Status: Active
```

**If domain not configured:**
1. Go to Railway Dashboard → Service → Settings → Domains
2. Add custom domain: `anyrent.shop`
3. Update DNS records (if needed)
4. Wait for SSL certificate (5-10 minutes)

---

### Step 6: Force Redeploy

If all above checks pass but still 404:

```bash
# Trigger redeploy
railway up --service client --environment production

# Or via Railway Dashboard:
# Service → Deployments → Redeploy
```

---

## 🔍 Debugging Commands

### Check Service Logs
```bash
railway logs --service client --environment production --tail
```

### Check Build Logs
```bash
railway logs --service client --environment production --deployment [deployment-id]
```

### Test API Connection
```bash
# From client service, test API
railway run --service client --environment production curl https://api.anyrent.shop/api/health
```

### Check Environment Detection
```bash
# Check what environment is detected
railway run --service client --environment production node -e "console.log(process.env.NODE_ENV, process.env.NEXT_PUBLIC_APP_ENV)"
```

---

## 📋 Quick Checklist

- [ ] Client service exists in production environment
- [ ] Service status: Running ✅
- [ ] Environment variables set:
  - [ ] `NODE_ENV=production`
  - [ ] `NEXT_PUBLIC_API_URL=https://api.anyrent.shop`
  - [ ] `NEXT_PUBLIC_APP_ENV=production`
  - [ ] `NEXTAUTH_SECRET` (matches API)
  - [ ] `NEXTAUTH_URL=https://anyrent.shop`
- [ ] Build successful (check logs)
- [ ] Service running (check status)
- [ ] Custom domain configured: `anyrent.shop`
- [ ] DNS records correct
- [ ] SSL certificate active

---

## 🚨 Common Issues & Solutions

### Issue 1: 404 Not Found

**Cause:** Service not deployed or wrong domain

**Fix:**
```bash
# Verify service exists
railway status --service client --environment production

# If missing, create service:
# Railway Dashboard → New Service → Select apps/client
```

### Issue 2: Build Failed

**Cause:** Missing dependencies or Prisma Client

**Fix:**
```bash
# Check Dockerfile includes Prisma generate
# Update build command if needed
```

### Issue 3: Wrong API URL

**Cause:** `NEXT_PUBLIC_API_URL` not set or wrong

**Fix:**
```bash
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service client --environment production
railway up --service client --environment production
```

### Issue 4: Environment Detection Wrong

**Cause:** `NEXT_PUBLIC_APP_ENV` not set

**Fix:**
```bash
railway variables --set NEXT_PUBLIC_APP_ENV=production --service client --environment production
railway up --service client --environment production
```

---

## ✅ Expected Result

After fixing:

```bash
curl https://anyrent.shop/login
# Expected: HTTP 200 with HTML content

curl https://anyrent.shop/
# Expected: HTTP 200 with HTML content
```

---

## 📞 Still Not Working?

1. **Check Railway Dashboard:**
   - Service → Logs (runtime errors)
   - Service → Deployments (build errors)
   - Service → Settings → Environment Variables

2. **Compare with Development:**
   ```bash
   # Check dev service (working)
   railway status --service dev-client --environment development
   railway variables --service dev-client --environment development
   
   # Compare with production
   railway status --service client --environment production
   railway variables --service client --environment production
   ```

3. **Check API Service:**
   ```bash
   # Verify API is accessible
   curl https://api.anyrent.shop/api/health
   ```

4. **Check CORS:**
   - API service must allow `https://anyrent.shop` in CORS_ORIGINS

---

## 🎯 Summary

**Most likely causes:**
1. Client service not deployed to production
2. Environment variables missing (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`)
3. Build failed (check logs)
4. Service crashed (check logs)

**Quick fix:**
1. Verify service exists and is running
2. Set all required environment variables
3. Force redeploy
4. Check logs for errors

