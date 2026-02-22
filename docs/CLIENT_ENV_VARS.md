# Client Service Environment Variables

## 📋 Required Environment Variables for Vercel

### 🔴 **CRITICAL - Required for Production**

#### **1. NEXT_PUBLIC_API_URL** ⭐ **MOST IMPORTANT**
- **Description**: API service URL that client app calls
- **Example**: `https://api.anyrent.shop`
- **Usage**: Used by `@rentalshop/utils` to configure API endpoints
- **Required**: ✅ **YES** - Without this, login and all API calls will fail
- **Vercel Setup**: 
  - Go to: Project Settings → Environment Variables
  - Add for **Production**, **Preview**, and **Development** environments
  - Value: Your Railway API URL (e.g., `https://api.anyrent.shop`)

#### **2. NEXT_PUBLIC_CLIENT_URL**
- **Description**: Client app URL (for metadata, sitemap, SEO)
- **Example**: `https://anyrent.shop` or `https://rentalshop-nextjs-client.vercel.app`
- **Usage**: Used in metadata, sitemap, structured data
- **Required**: ⚠️ **Recommended** - Defaults to `https://anyrent.shop` if not set
- **Vercel Setup**: Set to your Vercel deployment URL

#### **3. NEXT_PUBLIC_APP_ENV**
- **Description**: Application environment (development/production)
- **Example**: `production`, `development`, `staging`
- **Usage**: Used for environment-specific configurations
- **Required**: ⚠️ **Optional** - Defaults based on Vercel environment
- **Vercel Setup**: Usually auto-set by Vercel, but can be explicitly set

### 🟡 **Optional - SEO & Verification**

#### **4. NEXT_PUBLIC_GOOGLE_VERIFICATION**
- **Description**: Google Search Console verification code
- **Example**: `abc123def456`
- **Usage**: Meta tag for Google verification
- **Required**: ❌ **Optional**

#### **5. NEXT_PUBLIC_YANDEX_VERIFICATION**
- **Description**: Yandex Webmaster verification code
- **Example**: `xyz789`
- **Usage**: Meta tag for Yandex verification
- **Required**: ❌ **Optional**

#### **6. NEXT_PUBLIC_YAHOO_VERIFICATION**
- **Description**: Yahoo verification code
- **Example**: `verification123`
- **Usage**: Meta tag for Yahoo verification
- **Required**: ❌ **Optional**

## 🚀 **Vercel Setup Instructions**

### **Step 1: Add Environment Variables**

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Add the following variables:

#### **For Production Environment:**
```
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
NEXT_PUBLIC_CLIENT_URL=https://anyrent.shop
NEXT_PUBLIC_APP_ENV=production
```

#### **For Preview Environment:**
```
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
NEXT_PUBLIC_CLIENT_URL=https://rentalshop-nextjs-client-git-<branch>-yourteam.vercel.app
NEXT_PUBLIC_APP_ENV=preview
```

#### **For Development Environment:**
```
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
```

### **Step 2: Verify Configuration**

After adding environment variables:
1. **Redeploy** your application (Vercel will automatically redeploy)
2. Check build logs to ensure variables are loaded
3. Test login functionality to verify API connection

### **Step 3: Test API Connection**

1. Open your deployed client app
2. Try to login
3. Check browser console for API calls
4. Verify API URL is correct: `🔍 API URLs created/refreshed, base URL: https://api.anyrent.shop`

## 🔍 **How Environment Variables Are Used**

### **API Configuration**
```typescript
// packages/utils/src/config/api.ts
// Uses NEXT_PUBLIC_API_URL to create API endpoints
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
```

### **Metadata & SEO**
```typescript
// apps/client/app/layout.tsx
metadataBase: new URL(process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop')
```

### **Sitemap**
```typescript
// apps/client/app/sitemap.ts
const baseUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://anyrent.shop'
```

## ⚠️ **Important Notes**

1. **NEXT_PUBLIC_*** prefix is required** - These variables are exposed to the browser
2. **Build-time vs Runtime**: `NEXT_PUBLIC_*` variables are embedded at build time
3. **After adding variables**: You must **redeploy** for changes to take effect
4. **API URL must be accessible**: Ensure your API service (Railway) is running and accessible
5. **CORS Configuration**: Make sure your API service allows requests from your Vercel domain

## 🔐 **Security Notes**

- ✅ **Safe to expose**: `NEXT_PUBLIC_*` variables are meant to be public
- ❌ **Never expose**: Secrets, API keys, database URLs (these are server-side only)
- ✅ **Client app doesn't need**: Database credentials, JWT secrets, etc.

## 📝 **Quick Checklist**

- [ ] `NEXT_PUBLIC_API_URL` set to your Railway API URL
- [ ] `NEXT_PUBLIC_CLIENT_URL` set to your Vercel deployment URL
- [ ] Variables added for all environments (Production, Preview, Development)
- [ ] Application redeployed after adding variables
- [ ] Login functionality tested and working
- [ ] API calls successful (check browser console)

## 🆘 **Troubleshooting**

### **Error: "API URLs created/refreshed, base URL: undefined"**
- **Cause**: `NEXT_PUBLIC_API_URL` not set
- **Fix**: Add `NEXT_PUBLIC_API_URL` environment variable in Vercel

### **Error: "Login failed" or API calls failing**
- **Cause**: Wrong API URL or API service not accessible
- **Fix**: 
  1. Verify `NEXT_PUBLIC_API_URL` is correct
  2. Check API service (Railway) is running
  3. Verify CORS allows your Vercel domain

### **Error: "PRISMA CLIENT CREATION FAILED"**
- **Cause**: Prisma being bundled into client-side code (should be fixed now)
- **Fix**: Ensure latest code is deployed with Prisma bundling fixes

## 📚 **Related Documentation**

- [Railway API Environment Variables](./RAILWAY_MANUAL_DEPLOY.md)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
