# Vercel Migration Status - Admin App

## ✅ Completed Implementation

### Code Changes

#### 1. Vercel Configuration Files
- ✅ **Created**: `apps/admin/vercel.json`
  - Build command for monorepo
  - Security headers configuration
  - Framework detection (Next.js)

#### 2. Next.js Configuration
- ✅ **Updated**: `apps/admin/next.config.js`
  - Removed `output: 'standalone'` (not needed for Vercel)
  - Removed `rewrites()` (admin app calls Railway API directly)
  - Kept all necessary monorepo configurations

#### 3. API CORS Configuration
All API routes have been updated to support both Railway and Vercel admin domains:

**Railway Admin Domains:**
- Production: `https://admin.anyrent.shop`
- Development: `https://dev-admin.anyrent.shop`

**Vercel Admin Domains:**
- Production: `https://adminvercel.anyrent.shop`
- Development: `https://dev-adminvercel.anyrent.shop`

**Updated Files (12 total):**
- ✅ `apps/api/middleware.ts`
- ✅ `apps/api/app/api/auth/login/route.ts`
- ✅ `apps/api/app/api/auth/refresh/route.ts`
- ✅ `apps/api/app/api/public/[tenantKey]/categories/route.ts`
- ✅ `apps/api/app/api/public/[tenantKey]/products/route.ts`
- ✅ `apps/api/app/api/posts/public/route.ts`
- ✅ `apps/api/app/api/posts/categories/public/route.ts`
- ✅ `apps/api/app/api/posts/tags/public/route.ts`
- ✅ `apps/api/app/api/posts/slug/[slug]/route.ts`
- ✅ `apps/api/app/api/plans/public/route.ts`
- ✅ `apps/api/app/api/sync-proxy/route.ts`
- ✅ `apps/api/app/api/sync-proxy/login/route.ts`

#### 4. Documentation
- ✅ **Created**: `docs/VERCEL_DEPLOYMENT.md`
  - Complete deployment guide
  - Environment variables setup
  - Custom domain configuration
  - Troubleshooting guide

- ✅ **Updated**: `env.example`
  - Added notes about both Railway and Vercel deployments
  - Documented all 4 admin domains

## 📋 Next Steps (Manual Actions Required)

### 1. Create Vercel Project

**Using Vercel Dashboard:**
1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Configure:
   - **Project Name**: `rentalshop-admin`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/admin`
   - **Build Command**: `cd ../.. && yarn workspace @rentalshop/admin build`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && yarn install`

### 2. Configure Custom Domains

**Production Domain: `adminvercel.anyrent.shop`**
1. Vercel Dashboard → Project → **Settings** → **Domains**
2. Add domain: `adminvercel.anyrent.shop`
3. Configure DNS: CNAME `adminvercel` → `cname.vercel-dns.com`
4. Assign to **Production** branch (main/master)

**Development Domain: `dev-adminvercel.anyrent.shop`**
1. Same **Settings** → **Domains** page
2. Add domain: `dev-adminvercel.anyrent.shop`
3. Configure DNS: CNAME `dev-adminvercel` → `cname.vercel-dns.com`
4. Assign to **Development** branch

### 3. Set Up Environment Variables

**Production Environment:**
1. Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Add variable và chọn **Production** environment
3. Variables:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
NEXTAUTH_SECRET=<same-as-railway-api>
NEXTAUTH_URL=https://adminvercel.anyrent.shop
```

**Development Environment:**
1. Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Add variable và chọn **Development** environment (chỉ Development, không chọn Production hay Preview)
3. Vercel sẽ hỏi branch name → nhập `development`
4. Chỉ áp dụng cho branch `development`

Variables:
```
NODE_ENV=development
NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
NEXTAUTH_SECRET=<same-as-railway-api>
NEXTAUTH_URL=https://dev-adminvercel.anyrent.shop
```

**Lưu ý:**
- **Production** environment chỉ áp dụng cho production branch (main/master)
- **Preview** environment áp dụng cho tất cả branches trừ production
- **Development** environment chỉ áp dụng cho branch được chỉ định

### 4. Update Railway API CORS_ORIGINS

**Important**: Add Vercel domains to Railway API service environment variables.

**Production Environment:**
```
https://admin.anyrent.shop,https://adminvercel.anyrent.shop
```

**Development Environment:**
```
https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
```

**Or single CORS_ORIGINS for both:**
```
https://admin.anyrent.shop,https://adminvercel.anyrent.shop,https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
```

### 5. Configure Branch Deployments

1. Vercel Dashboard → Project → **Settings** → **Git**
2. Set **Production Branch**: `main` or `master`
3. Enable automatic deployments for both branches

### 6. Test Deployment

**Production:**
- [ ] Build completes successfully
- [ ] App loads at `https://adminvercel.anyrent.shop`
- [ ] SSL certificate is valid
- [ ] API calls work (no CORS errors)
- [ ] Authentication works

**Development:**
- [ ] Build completes successfully
- [ ] App loads at `https://dev-adminvercel.anyrent.shop`
- [ ] SSL certificate is valid
- [ ] API calls work (no CORS errors)
- [ ] Authentication works
- [ ] Uses development API URL

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────┐
│         Admin App Deployments        │
├─────────────────────────────────────┤
│                                     │
│  Railway (Existing):                │
│  - admin.anyrent.shop (production)  │
│  - dev-admin.anyrent.shop (dev)     │
│                                     │
│  Vercel (New):                      │
│  - adminvercel.anyrent.shop (prod)  │
│  - dev-adminvercel.anyrent.shop     │
│                                     │
└─────────────────────────────────────┘
              │
              │ HTTPS
              ▼
┌─────────────────────────────────────┐
│      Railway API (Single)           │
│  - api.anyrent.shop (production)    │
│  - dev-api.anyrent.shop (dev)       │
│                                     │
│  CORS allows all 4 admin domains    │
└─────────────────────────────────────┘
```

## 📝 Notes

- Both Railway and Vercel admin apps can run simultaneously
- All 4 admin domains are configured in API CORS
- Railway admin remains active (no disruption)
- Vercel admin can be tested independently
- After verification, you can choose to keep both or switch DNS

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Both production domains work: `admin.anyrent.shop` (Railway) and `adminvercel.anyrent.shop` (Vercel)
- [ ] Both development domains work: `dev-admin.anyrent.shop` (Railway) and `dev-adminvercel.anyrent.shop` (Vercel)
- [ ] No CORS errors in browser console
- [ ] API calls succeed from both deployments
- [ ] Authentication works on both
- [ ] All features accessible on both

## 📚 Reference

- Full deployment guide: `docs/VERCEL_DEPLOYMENT.md`
- Environment variables: `env.example`
