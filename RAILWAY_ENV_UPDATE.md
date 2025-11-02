# Railway Environment Variables Update Guide

## 🔄 Cập nhật URL Production từ Railway sang Custom Domain

Nếu trang production vẫn đang dùng `api-pro-production.up.railway.app`, bạn cần cập nhật environment variables trên Railway.

---

## ✅ **QUICK FIX**

### Cách 1: Railway CLI (Recommended)

```bash
# Đăng nhập Railway
railway login

# Link to project
railway link

# Cập nhật NEXT_PUBLIC_API_URL cho API service
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service apis

# Cập nhật NEXT_PUBLIC_API_URL cho Admin service
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service admin

# Cập nhật NEXT_PUBLIC_API_URL cho Client service
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service client

# Redeploy sau khi cập nhật
railway up --service apis
railway up --service admin
railway up --service client
```

### Cách 2: Railway Dashboard (Web UI)

1. Truy cập https://railway.app
2. Chọn project của bạn
3. Chọn environment **Production**
4. Cho mỗi service (API, Admin, Client):
   - Click vào service
   - Vào tab **Variables**
   - Tìm `NEXT_PUBLIC_API_URL`
   - Click **Edit** và đổi giá trị thành: `https://api.anyrent.shop`
   - Click **Save**
5. Redeploy tất cả services

---

## 📋 **COMPLETE ENVIRONMENT VARIABLES CHECKLIST**

### API Service (Production)

```bash
# Required Variables
NEXT_PUBLIC_API_URL=https://api.anyrent.shop           # ✅ CRITICAL
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-secret-32-chars-min
JWT_EXPIRES_IN=1d
NEXTAUTH_SECRET=your-secret-32-chars-min               # Phải giống nhau across services
NEXTAUTH_URL=https://api.anyrent.shop
API_URL=https://api.anyrent.shop
CLIENT_URL=https://anyrent.shop
ADMIN_URL=https://admin.anyrent.shop
CORS_ORIGINS=https://anyrent.shop,https://admin.anyrent.shop

# Optional Variables
LOG_LEVEL=info
LOG_FORMAT=json
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@anyrent.shop

# AWS S3 (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET_NAME=rentalshop-images
AWS_CLOUDFRONT_DOMAIN=your-cloudfront.cloudfront.net

# AWS SES (Optional)
AWS_SES_REGION=ap-southeast-1
```

### Admin Service (Production)

```bash
# Required Variables
NEXT_PUBLIC_API_URL=https://api.anyrent.shop           # ✅ CRITICAL
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-32-chars-min               # Phải giống API & Client
NEXTAUTH_URL=https://api.anyrent.shop
```

### Client Service (Production)

```bash
# Required Variables
NEXT_PUBLIC_API_URL=https://api.anyrent.shop           # ✅ CRITICAL
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-32-chars-min               # Phải giống API & Admin
NEXTAUTH_URL=https://api.anyrent.shop
```

---

## 🔍 **VERIFY CONFIGURATION**

### Check API Health

```bash
# Check production API
curl https://api.anyrent.shop/api/health

# Should return:
# {"status":"ok","environment":"production"}
```

### Check Environment Detection

Mở browser console trên trang production và check:

```javascript
console.log('Environment:', process.env.NEXT_PUBLIC_APP_ENV)
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
```

Should show:
- Environment: `production`
- API URL: `https://api.anyrent.shop`

### Check Swagger Documentation

```bash
# Open in browser
https://api.anyrent.shop/api/swagger

# Should show servers:
# 1. https://api.anyrent.shop (Production server)
# 2. https://dev-api.anyrent.shop (Development server)
```

---

## 🐛 **TROUBLESHOOTING**

### Problem: Vẫn dùng Railway URL

**Solution:**
1. Check environment variables đã đúng chưa
2. Redeploy sau khi cập nhật variables
3. Clear cache: `rm -rf .next` và redeploy

```bash
# Force redeploy
railway up --service apis --force
railway up --service admin --force  
railway up --service client --force
```

### Problem: Mixed URLs

**Solution:** Đảm bảo tất cả URLs nhất quán:

```bash
# Tất cả phải dùng: api.anyrent.shop
✅ NEXT_PUBLIC_API_URL=https://api.anyrent.shop
✅ API_URL=https://api.anyrent.shop
✅ NEXTAUTH_URL=https://api.anyrent.shop

❌ NEXT_PUBLIC_API_URL=https://api-pro-production.up.railway.app
❌ API_URL=https://xxx.up.railway.app
```

### Problem: CORS Errors

**Solution:** Thêm domain mới vào CORS_ORIGINS:

```bash
railway variables --set CORS_ORIGINS='https://anyrent.shop,https://admin.anyrent.shop,https://api.anyrent.shop' --service apis
```

---

## 🚀 **DEPLOYMENT STEPS**

### 1. Update Environment Variables

```bash
railway link
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service apis
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service admin
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service client
```

### 2. Verify Changes

```bash
# Check variables
railway variables --service apis
railway variables --service admin
railway variables --service client
```

### 3. Redeploy

```bash
# Deploy all services
railway up --service apis
railway up --service admin
railway up --service client

# Or deploy from Git (triggers auto-deploy)
git push origin main
```

### 4. Monitor Deployment

```bash
# Watch logs
railway logs --service apis -f
railway logs --service admin -f
railway logs --service client -f
```

### 5. Test Production

```bash
# Health check
curl https://api.anyrent.shop/api/health

# Login test
curl -X POST https://api.anyrent.shop/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

---

## 📊 **EXPECTED RESULTS**

### Before Update
```
❌ API URL: api-pro-production.up.railway.app
❌ Swagger: up.railway.app domains
❌ Documentation: Railway URLs
```

### After Update
```
✅ API URL: api.anyrent.shop
✅ Swagger: api.anyrent.shop domains
✅ Documentation: anyrent.shop domains
✅ All services using custom domain
```

---

## ⚠️ **IMPORTANT NOTES**

1. **NEXTAUTH_SECRET** phải **GIỐNG NHAU** across 3 services (API, Admin, Client)
2. **NEXT_PUBLIC_API_URL** là **CRITICAL** - ảnh hưởng trực tiếp đến API calls
3. Sau khi cập nhật variables, **PHẢI REDEPLOY** để áp dụng thay đổi
4. Development environment giữ nguyên: `dev-api.anyrent.shop`
5. Production environment dùng: `api.anyrent.shop`

---

## 📝 **DEPLOYMENT SUMMARY**

```
┌─────────────────────────────────────────────────────────────┐
│                   RAILWAY PRODUCTION UPDATE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Old URLs (Railway):                                         │
│  ❌ api-pro-production.up.railway.app                        │
│  ❌ admin-production.up.railway.app                          │
│  ❌ client-production.up.railway.app                         │
│                                                              │
│  New URLs (Custom Domain):                                   │
│  ✅ api.anyrent.shop                                         │
│  ✅ admin.anyrent.shop                                       │
│  ✅ anyrent.shop                                             │
│                                                              │
│  Development URLs (Keep):                                    │
│  ✅ dev-api.anyrent.shop                                     │
│  ✅ dev-admin.anyrent.shop                                   │
│  ✅ dev.anyrent.shop                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: January 2025  
**Status**: Ready for execution  
**Impact**: High - affects all API calls in production

