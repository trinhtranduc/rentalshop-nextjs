# Vercel Deployment Guide

This guide covers deploying the Rental Shop admin and client apps to Vercel while keeping the API and database on Railway.

## Overview

- **Admin App**: Deployed to Vercel (both production and development environments)
- **Client App**: Will be deployed to Vercel in Phase 2 (after admin verification)
- **API**: Remains on Railway
- **Database**: Remains on Railway

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Vercel        │         │    Railway       │
│                 │         │                  │
│  ┌───────────┐  │         │  ┌─────────────┐ │
│  │  Admin    │──┼─────────┼─▶│    API      │ │
│  │  (Next.js)│  │ HTTPS   │  │  (Next.js)  │ │
│  └───────────┘  │         │  └─────────────┘ │
│                 │         │         │         │
│  ┌───────────┐  │         │         ▼         │
│  │  Client   │──┼─────────┼─▶  PostgreSQL   │
│  │  (Next.js)│  │ HTTPS   │    Database     │
│  └───────────┘  │         │                  │
└─────────────────┘         └─────────────────┘
```

## Phase 1: Admin App Deployment

### Prerequisites

1. Vercel account (free tier is sufficient)
2. Git repository connected to Vercel
3. Custom domains configured in DNS provider
4. Railway API service running and accessible

### Step 1: Create Vercel Project

#### Using Vercel Dashboard (Recommended)

1. Go to [https://vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository (GitHub/GitLab/Bitbucket)
4. Configure project:
   - **Project Name**: `rentalshop-admin`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/admin`
   - **Build Command**: `cd ../.. && SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && yarn install`
5. Click **"Deploy"**

**Lưu ý quan trọng**: 
- Build Command phải sử dụng `turbo run build` để tự động build dependencies trước
- `SKIP_ENV_VALIDATION=true` cần thiết để tránh lỗi validation khi build
- Nếu project đã được tạo, cần cập nhật Build Command trong **Settings** → **General** → **Build & Development Settings**

#### Using Vercel CLI

```bash
cd apps/admin
vercel login
vercel link
# Follow prompts to create project
vercel --prod
```

### Step 2: Configure Custom Domains

#### Production Domain: `adminvercel.anyrent.shop`

**Note**: Railway admin app uses `admin.anyrent.shop`. Vercel admin app uses `adminvercel.anyrent.shop` to avoid conflicts.

1. Go to Vercel Dashboard → Select `rentalshop-admin` project
2. Go to **Settings** → **Domains**
3. Add custom domain: `adminvercel.anyrent.shop`
4. Configure DNS:
   - Add CNAME record: `admin` → `cname.vercel-dns.com`
   - Or A record: Point to Vercel IP addresses
5. Assign to **Production** branch (main/master)
6. Wait for DNS propagation (5-30 minutes)
7. SSL certificate will be automatically provisioned

#### Development Domain: `dev-adminvercel.anyrent.shop`

**Note**: Railway admin app uses `dev-admin.anyrent.shop`. Vercel admin app uses `dev-adminvercel.anyrent.shop` to avoid conflicts.

1. In the same **Settings** → **Domains** page
2. Add custom domain: `dev-adminvercel.anyrent.shop`
3. Configure DNS:
   - Add CNAME record: `dev-admin` → `cname.vercel-dns.com`
4. Assign to **Development** branch (or specific branch like `development`)
5. Wait for DNS propagation
6. SSL certificate will be automatically provisioned

#### Branch Configuration

1. Go to **Settings** → **Git**
2. Configure branch assignments:
   - **Production Branch**: `main` or `master` (deploys to `adminvercel.anyrent.shop`)
   - **Development Branch**: `development` (deploys to `dev-adminvercel.anyrent.shop`)
3. Enable automatic deployments for both branches

**Lưu ý về Environment Variables và Branches:**

Với cách setup Production + Development:
- **Production Branch** (`main`/`master`) → Sử dụng **Production** environment variables → Deploy tới `adminvercel.anyrent.shop`
- **Development Branch** (`development`) → Sử dụng **Development** environment variables → Deploy tới `dev-adminvercel.anyrent.shop`
- **Other Branches** → Sử dụng **Production** environment variables (fallback) → Deploy tới preview URL

**Ví dụ:**
- Push code lên `main` → Deploy với Production variables → `adminvercel.anyrent.shop`
- Push code lên `development` → Deploy với Development variables → `dev-adminvercel.anyrent.shop`
- Push code lên `feature/new-feature` → Deploy với Production variables (fallback) → `feature-new-feature-xxx.vercel.app`

### Step 3: Set Up Environment Variables

Chúng ta sử dụng **Production + Development** environments để có sự kiểm soát chính xác:

- **Production**: Áp dụng cho production branch (main/master)
- **Development**: Áp dụng cho branch `development` cụ thể

#### Production Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Thêm từng variable và chọn **Production** environment (checkbox Production)

Thêm các variables sau:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
NEXTAUTH_SECRET=<same-secret-as-railway-api>
NEXTAUTH_URL=https://adminvercel.anyrent.shop
SKIP_ENV_VALIDATION=true
```

**Lưu ý**: 
- Chỉ chọn checkbox **Production**, không chọn Preview hay Development
- `SKIP_ENV_VALIDATION=true` cần thiết để tránh lỗi validation khi build (package @rentalshop/env sẽ skip validation)

#### Development Environment Variables

1. Trong cùng trang **Environment Variables**
2. Click **Add New**
3. Thêm từng variable và chọn **Development** environment (checkbox Development)
4. Khi chọn Development, Vercel sẽ hỏi branch name → nhập `development`

Thêm các variables sau:

```
NODE_ENV=development
NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
NEXTAUTH_SECRET=<same-secret-as-railway-api>
NEXTAUTH_URL=https://dev-adminvercel.anyrent.shop
SKIP_ENV_VALIDATION=true
```

**Lưu ý**: 
- Chỉ chọn checkbox **Development**
- Khi Vercel hỏi branch name, nhập: `development`
- Variables này chỉ áp dụng cho branch `development`
- `SKIP_ENV_VALIDATION=true` cần thiết để tránh lỗi validation khi build

#### Kết quả

- **Branch `main` hoặc `master`**: Sử dụng Production variables → Deploy tới `adminvercel.anyrent.shop`
- **Branch `development`**: Sử dụng Development variables → Deploy tới `dev-adminvercel.anyrent.shop`
- **Các branches khác**: Sử dụng Production variables (hoặc không có variables nếu không được set)

**Important Notes:**
- Replace `<same-secret-as-railway-api>` with the actual `NEXTAUTH_SECRET` from Railway API
- Use the same `NEXTAUTH_SECRET` for both environments (or different for better security)
- Variables are automatically applied based on the branch being deployed
- **Development** environment chỉ áp dụng cho branch `development` được chỉ định
- **Production** environment chỉ áp dụng cho production branch (main/master)

### Step 4: Update Railway API CORS Configuration

Update `CORS_ORIGINS` in Railway API service to include admin domains:

**For Production Environment:**
Add both Railway and Vercel admin domains:
```
https://admin.anyrent.shop,https://adminvercel.anyrent.shop
```

**For Development Environment:**
Add both Railway and Vercel admin domains:
```
https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
```

**If using single CORS_ORIGINS for both environments:**
```
https://admin.anyrent.shop,https://adminvercel.anyrent.shop,https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
```

**Note**: Both Railway and Vercel admin apps need to be in CORS_ORIGINS to allow requests from both deployments.

**Optional**: Add Vercel preview domains pattern `*.vercel.app` for testing.

### Step 5: Verify Deployment

1. **Check Build Logs**: Verify build completes without errors
2. **Test Production**: Visit `https://adminvercel.anyrent.shop` and verify it loads
3. **Test Development**: Visit `https://dev-adminvercel.anyrent.shop` and verify it loads
4. **Test API Connectivity**: Verify admin app can call Railway API
5. **Check CORS**: Verify no CORS errors in browser console
6. **Test Authentication**: Verify login/logout works correctly

## Configuration Files

### `apps/admin/vercel.json`

This file configures Vercel deployment for the admin app:

```json
{
  "buildCommand": "cd ../.. && SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin",
  "devCommand": "cd ../.. && yarn workspace @rentalshop/admin dev",
  "installCommand": "cd ../.. && yarn install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "rewrites": [],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Lưu ý**: 
- Build Command sử dụng `turbo run build` để tự động build dependencies trước
- `SKIP_ENV_VALIDATION=true` cần thiết để tránh lỗi validation khi build
- **Nếu Vercel không đọc `vercel.json`**, cần cập nhật Build Command trong Dashboard:
  1. Go to **Settings** → **General** → **Build & Development Settings**
  2. Update **Build Command** to: `cd ../.. && SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin`
  3. Save và redeploy

### `apps/admin/next.config.js` Changes

**Removed:**
- `output: 'standalone'` - Not needed for Vercel
- `rewrites()` - Admin app calls Railway API directly using `NEXT_PUBLIC_API_URL`

**Kept:**
- `transpilePackages` - Required for monorepo packages
- `experimental.serverComponentsExternalPackages` - Required for Prisma
- Other Next.js optimizations

## Monorepo Deployment Considerations

### Build Process

Vercel automatically:
1. Runs `yarn install` at the root (via `installCommand`)
2. Runs build command from `apps/admin` directory
3. Uses workspace commands to build only the admin app

### Dependencies

All dependencies are installed at the monorepo root, ensuring:
- Shared packages (`@rentalshop/ui`, `@rentalshop/utils`, etc.) are available
- Workspace dependencies resolve correctly
- Build process works seamlessly

## Environment Variables

### Required Variables

| Variable | Production | Development | Description |
|----------|-----------|-------------|-------------|
| `NODE_ENV` | `production` | `development` | Node environment |
| `NEXT_PUBLIC_API_URL` | `https://api.anyrent.shop` | `https://dev-api.anyrent.shop` | Railway API URL |
| `NEXTAUTH_SECRET` | Same as Railway | Same as Railway | Authentication secret |
| `NEXTAUTH_URL` | `https://adminvercel.anyrent.shop` | `https://dev-adminvercel.anyrent.shop` | Admin app URL |

### Variable Assignment

Chúng ta sử dụng **Production + Development** environments:

**Production Environment:**
- Chọn checkbox **Production** (chỉ Production, không chọn Preview hay Development)
- Áp dụng cho: Production branch (main/master)
- Không áp dụng cho: Tất cả branches khác

**Development Environment:**
- Chọn checkbox **Development** (chỉ Development, không chọn Production hay Preview)
- Vercel sẽ hỏi branch name → nhập `development`
- Áp dụng cho: Chỉ branch `development`
- Không áp dụng cho: Production branch và các branches khác

**Kết quả:**
- `main`/`master` branch → Production variables
- `development` branch → Development variables
- Các branches khác → Production variables (fallback)

## Testing Checklist

### Production Environment

- [ ] Build completes without errors
- [ ] App loads at `https://adminvercel.anyrent.shop`
- [ ] SSL certificate is valid
- [ ] API calls work (pointing to production API)
- [ ] No CORS errors
- [ ] Authentication works
- [ ] All features accessible

### Development Environment

- [ ] Build completes without errors
- [ ] App loads at `https://dev-adminvercel.anyrent.shop`
- [ ] SSL certificate is valid
- [ ] API calls work (pointing to development API)
- [ ] No CORS errors
- [ ] Authentication works
- [ ] Environment variables correctly applied

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Module not found: Can't resolve '@rentalshop/env'"
**Solution**: 
1. Cập nhật Build Command trong Vercel Dashboard:
   - Go to **Settings** → **General** → **Build & Development Settings**
   - Update **Build Command** to: `cd ../.. && SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin`
   - Save và redeploy
2. Turbo sẽ tự động build dependencies (`@rentalshop/env`, `@rentalshop/utils`, etc.) trước khi build admin app

**Issue**: Build fails with module not found errors
**Solution**: Ensure `installCommand` runs at root: `cd ../.. && yarn install`

**Issue**: Build fails with workspace errors
**Solution**: Verify `buildCommand` uses turbo: `cd ../.. && SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin`

### Viewing Full Build Logs in Vercel

**Issue**: Cannot see full build logs in Vercel dashboard (logs truncated or stuck)
**Solutions**:

**💡 RECOMMENDED: Test with Docker First**
- Use Docker to test build locally with full logs before deploying to Vercel
- See [DOCKER_TESTING.md](./DOCKER_TESTING.md) for complete guide
- Quick test: `yarn test:admin:docker`
- This shows full build output and helps debug issues faster

**Alternative Methods**:

1. **Expand Log Sections**:
   - In Vercel deployment page, click on each build step to expand
   - Look for "Installing dependencies", "Building", "Deploying" sections
   - Each section can be expanded individually

2. **Download Full Logs**:
   - Go to your deployment page in Vercel
   - Click the **"..."** (three dots) menu in the top right
   - Select **"Download Logs"** to get the complete build log as a text file
   - This includes all output, even truncated sections

3. **Use Vercel CLI** (Recommended for detailed debugging):
   ```bash
   # Install Vercel CLI globally
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link to your project
   cd apps/admin
   vercel link
   
   # View logs for latest deployment
   vercel logs
   
   # View logs for specific deployment
   vercel logs [deployment-url]
   ```

4. **Test Build Locally** (Best way to debug):
   ```bash
   # Navigate to project root
   cd /Users/trinhtran/Documents/Source-Code/rentalshop-nextjs
   
   # Test the exact build command Vercel uses
   SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin
   
   # This will show you the full output and any errors
   # Fix any issues locally, then push to trigger Vercel build
   ```

5. **Check Build Command in Vercel Dashboard**:
   - Go to **Settings** → **General** → **Build & Development Settings**
   - Verify the **Build Command** field shows:
     ```
     cd ../.. && SKIP_ENV_VALIDATION=true turbo run build --filter=@rentalshop/admin
     ```
   - If it's different, update it and save
   - Vercel may override `vercel.json` settings with dashboard settings

6. **View Real-time Logs During Build**:
   - Start a new deployment (push a commit or manually trigger)
   - Watch the deployment page in real-time
   - Logs stream live during the build process
   - You can see each step as it happens

7. **Check Specific Error Messages**:
   - Look for red error messages in the build log
   - Common patterns to search for:
     - `Module not found`
     - `Cannot resolve`
     - `Error: Command exited with`
     - `Failed to compile`

### CORS Errors

**Issue**: CORS errors in browser console
**Solution**: 
1. Verify Railway API `CORS_ORIGINS` includes admin domains
2. Check that domains match exactly (including https://)
3. Verify API middleware allows the domains

### API Connection Issues

**Issue**: Admin app cannot connect to Railway API
**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check Railway API is accessible
3. Verify network requests in browser DevTools

### Authentication Issues

**Issue**: Login fails or sessions don't persist
**Solution**:
1. Verify `NEXTAUTH_SECRET` matches Railway API
2. Check `NEXTAUTH_URL` matches the actual domain
3. Verify cookies are set correctly (check browser DevTools)

## Cost Savings

- **Before**: 3 Railway services (API, Admin, Client) + Database
- **After Phase 1**: 2 Railway services (API, Client) + Database + 1 Vercel app (Admin)
- **After Phase 2**: 1 Railway service (API) + Database + 2 Vercel apps (Admin, Client)
- **Total Savings**: ~$10-20/month

## Vercel Free Tier Limits

- **Bandwidth**: 100GB/month
- **Deployments**: Unlimited
- **HTTPS**: Automatic
- **Custom Domains**: Supported
- **Build Time**: 45 minutes per build

## Phase 2: Client App (After Admin Verification)

**Only proceed after admin app is fully tested and verified working.**

Follow the same process as admin app:
1. Create Vercel project for client app
2. Configure custom domains (`anyrent.shop` and `dev.anyrent.shop`)
3. Set up environment variables
4. Update Railway API CORS_ORIGINS
5. Deploy and test

## Additional Resources

- [Docker Testing Guide](./DOCKER_TESTING.md) - **Test builds locally with full logs**
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Monorepo Deployment](https://vercel.com/docs/monorepos)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Quick Reference: Docker Testing

If Vercel build is stuck or logs are truncated, test locally with Docker:

```bash
# Quick test build
yarn test:admin:docker

# View full logs
cat /tmp/admin-docker-build.log

# Run container
yarn docker:admin:up

# Access at http://localhost:3001
```

See [DOCKER_TESTING.md](./DOCKER_TESTING.md) for detailed guide.
