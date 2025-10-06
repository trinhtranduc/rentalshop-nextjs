# 🌍 Environment Configuration Guide

## ✅ **CHUẨN HÓA HOÀN THÀNH!**

Environment management đã được refactor theo **industry best practices** và **DRY principles**.

---

## 📊 **BEFORE vs AFTER**

### ❌ **BEFORE (Messy - 9 files!)**
```
├── .env (DATABASE_URL="file:./dev.db") ❌ WRONG PATH
├── .env.development ❌ CONFUSING _LOCAL/_DEV/_PROD suffixes
├── .env.production ❌ CONFUSING _LOCAL/_DEV/_PROD suffixes
├── apps/api/.env ❌ DUPLICATE
├── apps/api/.env.development ❌ DUPLICATE
├── apps/api/.env.local ❌ DUPLICATE
├── apps/admin/.env.local ❌ DUPLICATE
└── apps/client/.env.local ❌ DUPLICATE
```

### ✅ **AFTER (Clean - 3 files!)**
```
├── .env ✅ COMMITTED (development defaults)
├── .env.production ✅ COMMITTED (production template)
├── .env.local ✅ GIT IGNORED (personal overrides)
├── env.example ✅ COMMITTED (documentation)
├── packages/env/ ✅ Type-safe validation package
└── apps/ ✅ NO .env files (inherit via symlinks)
```

---

## 🎯 **Current Setup**

### **1. Root `.env` (Development Defaults) - COMMITTED**
Location: `/Users/mac/Source-Code/rentalshop-nextjs/.env`

```bash
NODE_ENV=development
DATABASE_URL="file:/Users/mac/Source-Code/rentalshop-nextjs/prisma/dev.db"  # Absolute path
JWT_SECRET="local-jwt-secret-DO-NOT-USE-IN-PRODUCTION"
# ... all other dev defaults
```

**Purpose:**
- Default configuration for local development
- **COMMITTED to git** so team members get consistent setup
- All apps (client, admin, API) inherit these values via symlinks

### **2. Root `.env.production` (Template) - COMMITTED**
Location: `/Users/mac/Source-Code/rentalshop-nextjs/.env.production`

```bash
NODE_ENV=production
DATABASE_URL="${DATABASE_URL}"  # Set by hosting platform
JWT_SECRET="${JWT_SECRET}"  # Set by hosting platform
# ... production config with placeholders
```

**Purpose:**
- Template for production deployment
- **COMMITTED to git** as documentation
- Actual secrets set via hosting platform (Vercel, AWS, etc.)

### **3. Symlinks in Apps**
```bash
apps/api/.env -> ../../.env
apps/admin/.env -> ../../.env
apps/client/.env -> ../../.env
```

**Purpose:**
- Apps automatically inherit root `.env`
- Next.js loads `.env` from app directory
- No duplication, single source of truth

### **4. Optional `.env.local` (Personal Overrides) - GIT IGNORED**
Create if you need personal customization:

```bash
# My personal overrides
DATABASE_URL="file:./prisma/my-custom.db"
LOG_LEVEL="error"
ENABLE_DEBUG_LOGS="false"
```

**Purpose:**
- Personal development preferences
- **GIT IGNORED** - never committed
- Overrides values from `.env`

---

## 📦 **Type-Safe Environment Package**

### **`@rentalshop/env`**
Location: `/packages/env/src/index.ts`

**Features:**
- ✅ **Zod validation** - All env vars validated on import
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Auto-completion** - IDE autocomplete for all variables
- ✅ **Fail-fast** - Errors on startup, not runtime
- ✅ **Production validation** - Ensures secure secrets

**Usage:**
```typescript
import { env, isDevelopment, getCorsOrigins } from '@rentalshop/env';

// Type-safe access
const dbUrl = env.DATABASE_URL; // string (validated)
const jwtSecret = env.JWT_SECRET; // string (validated)

// Helper functions
if (isDevelopment()) {
  console.log('Running in development mode');
}

const origins = getCorsOrigins(); // string[] (parsed from CSV)
```

---

## 🔧 **Setup Instructions**

### **For New Developers**

1. **Clone repository**
   ```bash
   git clone <repo>
   cd rentalshop-nextjs
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Setup database**
   ```bash
   yarn db:regenerate-system
   ```

4. **(Optional) Create personal overrides**
   ```bash
   cp .env .env.local
   # Edit .env.local with your preferences
   ```

5. **Start development**
   ```bash
   # Start all apps
   yarn dev:all
   
   # Or individual apps
   yarn dev:client  # Port 3000
   yarn dev:admin   # Port 3001
   yarn dev:api     # Port 3002
   ```

### **For Production Deployment**

1. **Set environment variables in hosting platform**
   ```bash
   # Required
   DATABASE_URL="postgresql://..."
   JWT_SECRET="<strong-secret>"
   NEXTAUTH_SECRET="<strong-secret>"
   NEXTAUTH_URL="https://yourapp.com"
   CLIENT_URL="https://yourapp.com"
   API_URL="https://api.yourapp.com"
   
   # Optional
   CLOUDINARY_CLOUD_NAME="..."
   RESEND_API_KEY="..."
   SENTRY_DSN="..."
   ```

2. **Generate strong secrets**
   ```bash
   openssl rand -hex 32  # For JWT_SECRET
   openssl rand -hex 32  # For NEXTAUTH_SECRET
   ```

3. **Deploy**
   ```bash
   # Vercel
   vercel deploy --prod
   
   # Or other platform
   npm run build
   npm start
   ```

---

## 🔐 **Security Best Practices**

### ✅ **DO:**
- ✅ Commit `.env` with safe defaults for development
- ✅ Commit `.env.production` as template
- ✅ Use `.env.local` for personal overrides
- ✅ Set production secrets via hosting platform
- ✅ Use strong, randomly generated secrets in production
- ✅ Validate all environment variables on startup

### ❌ **DON'T:**
- ❌ Commit `.env.local` (contains personal data)
- ❌ Commit production secrets in `.env.production`
- ❌ Use weak/default secrets in production
- ❌ Create duplicate .env files in apps
- ❌ Use relative paths without understanding working directory

---

## 📋 **Environment Variables Reference**

### **Database**
- `DATABASE_URL` - Database connection string
  - Development: `"file:/absolute/path/to/prisma/dev.db"`
  - Production: `"postgresql://user:pass@host:5432/db"`

### **Authentication**
- `JWT_SECRET` - Secret for JWT tokens (CRITICAL)
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d", "1h")
- `NEXTAUTH_SECRET` - NextAuth secret (CRITICAL)
- `NEXTAUTH_URL` - Public URL of your app

### **API URLs**
- `CLIENT_URL` - Client app URL
- `ADMIN_URL` - Admin dashboard URL
- `API_URL` - Backend API URL

### **CORS**
- `CORS_ORIGINS` - Comma-separated allowed origins

### **File Upload**
- `UPLOAD_PROVIDER` - "local", "cloudinary", or "s3"
- `UPLOAD_PATH` - Path for local uploads
- `MAX_FILE_SIZE` - Max upload size in bytes

### **Email**
- `EMAIL_PROVIDER` - "console", "resend", or "sendgrid"
- `EMAIL_FROM` - From email address
- `RESEND_API_KEY` - Resend API key (if using Resend)

### **Logging**
- `LOG_LEVEL` - "debug", "info", "warn", "error"
- `LOG_FORMAT` - "pretty" or "json"

### **Feature Flags**
- `ENABLE_EMAIL_VERIFICATION` - "true" or "false"
- `ENABLE_ANALYTICS` - "true" or "false"
- `ENABLE_DEBUG_LOGS` - "true" or "false"

### **Rate Limiting**
- `RATE_LIMIT_WINDOW` - Time window (e.g., "15m")
- `RATE_LIMIT_MAX` - Max requests per window

---

## 🚀 **Advanced Usage**

### **Using Type-Safe Env in Code**

```typescript
// ✅ GOOD: Import from @rentalshop/env
import { env } from '@rentalshop/env';

const config = {
  database: env.DATABASE_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN
  }
};

// ❌ BAD: Direct process.env access
const dbUrl = process.env.DATABASE_URL; // string | undefined (not safe!)
```

### **Environment-Specific Logic**

```typescript
import { isDevelopment, isProduction } from '@rentalshop/env';

if (isDevelopment()) {
  console.log('Debug info here');
}

if (isProduction()) {
  // Production-only features
  enableAnalytics();
}
```

### **Validating Environment**

```typescript
import { validateEnvironment } from '@rentalshop/env';

const { valid, errors } = validateEnvironment();
if (!valid) {
  console.error('Environment errors:', errors);
  process.exit(1);
}
```

---

## 🎓 **Why This Approach?**

### **1. Single Source of Truth (DRY)**
- One `.env` file for development
- Apps inherit via symlinks
- No duplication or conflicts

### **2. Type Safety**
- Zod validation on import
- TypeScript types for all variables
- Catch errors early (compile-time, not runtime)

### **3. Security**
- Sensitive values in `.env.local` (git ignored)
- Production secrets from hosting platform
- Validation prevents weak secrets in production

### **4. Team Collaboration**
- `.env` committed = consistent dev environment
- `.env.production` committed = clear production requirements
- `.env.local` personal = no conflicts

### **5. Flexibility**
- Easy to override locally (`.env.local`)
- Easy to add new variables (update schema)
- Easy to deploy (platform env vars)

---

## 🐛 **Troubleshooting**

### **Apps can't find DATABASE_URL**
- Check symlinks: `ls -la apps/*/`.env`
- Should point to `../../.env`
- Recreate if needed: `ln -sf ../../.env apps/api/.env`

### **"Unable to open database file"**
- Check DATABASE_URL path
- Should be absolute: `file:/absolute/path/to/prisma/dev.db`
- Or correct relative: `file:../../prisma/dev.db` (from app dir)

### **Type errors with @rentalshop/env**
- Rebuild env package: `cd packages/env && npm run build`
- Restart dev server

### **Production secrets not loading**
- Set in hosting platform environment variables
- Don't use `${}` placeholders locally
- Verify with: `console.log(process.env.JWT_SECRET)`

---

## 📚 **Additional Resources**

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Zod Documentation](https://zod.dev/)
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/development-environment/environment-variables)
- [12-Factor App](https://12factor.net/config)

---

## ✨ **Summary**

**Achievement Unlocked:** Professional Environment Management! 🎉

✅ **Single `.env` source** - No more duplicate configs  
✅ **Type-safe access** - Full TypeScript support  
✅ **Validated on startup** - Fail fast with clear errors  
✅ **Production-ready** - Secure by default  
✅ **Team-friendly** - Consistent dev environment  
✅ **DRY compliant** - Zero duplication  

Your monorepo now has **enterprise-grade environment management**! 🚀

