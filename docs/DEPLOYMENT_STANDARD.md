# Standard Deployment Guide: Railway API + Vercel Client/Admin

This guide follows official Next.js, Vercel, and Railway best practices for deploying a monorepo with separate API and frontend applications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Railway    │         │    Vercel    │                 │
│  │              │         │              │                 │
│  │  API Service │◄────────┤ Client App   │                 │
│  │  (Port 3002) │  HTTP   │  (Port 3000) │                 │
│  │              │         │              │                 │
│  │  ┌────────┐  │         │  ┌────────┐  │                 │
│  │  │Postgres│  │         │  │  UI    │  │                 │
│  │  │  DB    │  │         │  │Components│                 │
│  │  └────────┘  │         │  └────────┘  │                 │
│  └──────────────┘         └──────────────┘                 │
│         ▲                          ▲                        │
│         │                          │                        │
│         └──────────┬───────────────┘                        │
│                    │                                        │
│              ┌──────────────┐                               │
│              │    Vercel    │                               │
│              │              │                               │
│              │  Admin App   │                               │
│              │  (Port 3001) │                               │
│              │              │                               │
│              │  ┌────────┐  │                               │
│              │  │  UI    │  │                               │
│              │  │Components│                               │
│              │  └────────┘  │                               │
│              └──────────────┘                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Railway account with PostgreSQL service
- Vercel account
- Git repository with monorepo structure
- Domain names configured (optional but recommended)

## Part 1: Railway API Deployment

### Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub repo** (or Git provider)
4. Connect your repository

### Step 2: Add PostgreSQL Service

1. In Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway automatically creates a PostgreSQL instance
4. Note the service name (e.g., "Postgres")

### Step 3: Add API Service

1. In Railway project, click **+ New**
2. Select **GitHub Repo** → Your repository
3. Railway will auto-detect the monorepo structure
4. Select **apps/api** as the root directory (or configure in `railway.json`)

### Step 4: Configure Railway Variables

1. Go to API Service → **Variables** tab
2. Add required variables (see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md))
3. Key variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   CORS_ORIGINS=https://anyrent.shop,https://admin.anyrent.shop,...
   JWT_SECRET=<32-char-secret>
   NEXTAUTH_SECRET=<32-char-secret>
   ```

### Step 5: Configure Railway Build

Railway uses `apps/api/railway.json` for configuration:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "startCommand": "cd apps/api && sh start.sh",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

**Key Points**:
- Uses Dockerfile for multi-stage build
- Runs migrations automatically via `start.sh`
- Health check endpoint: `/api/health`

### Step 6: Deploy

1. Railway automatically deploys on git push
2. Monitor deployment in Railway Dashboard
3. Check logs for any errors
4. Verify health check: `https://your-api.railway.app/api/health`

### Step 7: Configure Custom Domain (Optional)

1. Go to API Service → **Settings** → **Networking**
2. Add custom domain: `api.anyrent.shop`
3. Configure DNS records as instructed by Railway
4. SSL certificate is automatically provisioned

---

## Part 2: Vercel Client App Deployment

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your Git repository
4. Select **apps/client** as root directory

### Step 2: Configure Build Settings

Vercel uses `apps/client/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && npx prisma generate --schema=./prisma/schema.prisma && SKIP_ENV_VALIDATION=true npx turbo run build --filter=@rentalshop/client",
  "installCommand": "cd ../.. && yarn install --production=false",
  "framework": "nextjs"
}
```

**Key Points**:
- Builds from monorepo root
- Generates Prisma Client (needed for type definitions)
- Uses Turbo for optimized builds

### Step 3: Configure Environment Variables

1. Go to Project → **Settings** → **Environment Variables**
2. Add required variables (see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md))
3. Key variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.anyrent.shop
   NEXTAUTH_SECRET=<same-as-railway>
   NEXTAUTH_URL=https://anyrent.shop
   NEXT_PUBLIC_CLIENT_URL=https://anyrent.shop
   ```

### Step 4: Deploy

1. Vercel automatically deploys on git push
2. Monitor deployment in Vercel Dashboard
3. Check build logs for any errors
4. Verify deployment: `https://your-project.vercel.app`

### Step 5: Configure Custom Domain (Optional)

1. Go to Project → **Settings** → **Domains**
2. Add custom domain: `anyrent.shop`
3. Configure DNS records as instructed by Vercel
4. SSL certificate is automatically provisioned

---

## Part 3: Vercel Admin App Deployment

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your Git repository (same repo as Client)
4. Select **apps/admin** as root directory

### Step 2: Configure Build Settings

Vercel uses `apps/admin/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && npx prisma generate --schema=./prisma/schema.prisma && SKIP_ENV_VALIDATION=true npx turbo run build --filter=@rentalshop/admin",
  "installCommand": "cd ../.. && yarn install --production=false",
  "framework": "nextjs"
}
```

### Step 3: Configure Environment Variables

1. Go to Project → **Settings** → **Environment Variables**
2. Add required variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.anyrent.shop
   NEXTAUTH_SECRET=<same-as-railway>
   NEXTAUTH_URL=https://adminvercel.anyrent.shop
   ```

### Step 4: Deploy

1. Vercel automatically deploys on git push
2. Monitor deployment in Vercel Dashboard
3. Check build logs for any errors
4. Verify deployment: `https://your-admin-project.vercel.app`

### Step 5: Configure Custom Domain (Optional)

1. Go to Project → **Settings** → **Domains**
2. Add custom domain: `adminvercel.anyrent.shop`
3. Configure DNS records as instructed by Vercel
4. SSL certificate is automatically provisioned

---

## Part 4: Client/Server Code Separation

### Official Next.js Pattern

The monorepo follows Next.js official patterns for separating client and server code:

#### 1. Package.json Exports Field

Shared packages use conditional exports:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.mjs",
      "require": "./dist/server.js"
    }
  }
}
```

#### 2. Next.js serverComponentsExternalPackages

Client and Admin apps configure:

```javascript
// next.config.js
experimental: {
  serverComponentsExternalPackages: [
    '@prisma/client',
    '@prisma/engines',
    '@rentalshop/database',
    '@rentalshop/utils/server',
    '@rentalshop/auth/server'
  ]
}
```

#### 3. Import Rules

- **Client/Admin Apps**: Import from `@rentalshop/auth` (client-safe exports only)
- **API Routes**: Import from `@rentalshop/auth/server` (server-only functions)

**Example**:
```typescript
// ✅ Client/Admin (Vercel)
import { ROLE_PERMISSIONS } from '@rentalshop/auth';

// ✅ API Routes (Railway)
import { withPermissions, withAuthRoles } from '@rentalshop/auth/server';
```

#### 4. ESLint Rules

ESLint prevents client apps from importing server-only code:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          "@rentalshop/*/server",
          "@rentalshop/database",
          "@prisma/client"
        ]
      }
    ]
  }
}
```

---

## Part 5: CORS Configuration

### Railway API CORS Setup

CORS is configured in `apps/api/lib/cors.ts`:

1. **Base Origins**: Hardcoded in the file (includes localhost, production, and development domains)
2. **Additional Origins**: Set via `CORS_ORIGINS` environment variable in Railway

**Railway Variable**:
```
CORS_ORIGINS=https://anyrent.shop,https://admin.anyrent.shop,https://adminvercel.anyrent.shop,https://dev.anyrent.shop,https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
```

### Vercel Preview URLs

Vercel preview deployments are automatically included in base origins. For additional preview URLs, add them to `CORS_ORIGINS`.

---

## Part 6: Database Migrations

### Automatic Migrations (Railway)

Migrations run automatically on deployment via `apps/api/start.sh`:

```bash
#!/bin/bash
# Run migrations before starting the server
npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Start the server
next start -p 3002
```

**Key Points**:
- Migrations run at runtime (not during build)
- Ensures database is available before running migrations
- Retries if database is not ready
- Each deployment automatically applies pending migrations

### Manual Migrations (Development)

For local development:

```bash
# Generate migration
npx prisma migrate dev --schema=./prisma/schema.prisma

# Apply migration (production)
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

---

## Part 7: Monitoring and Debugging

### Railway API Monitoring

1. **Logs**: View in Railway Dashboard → API Service → **Deployments** → **View Logs**
2. **Health Check**: Monitor `/api/health` endpoint
3. **Metrics**: View in Railway Dashboard → **Metrics** tab

### Vercel Monitoring

1. **Logs**: View in Vercel Dashboard → Project → **Deployments** → **View Logs**
2. **Analytics**: View in Vercel Dashboard → **Analytics** tab
3. **Real-time Logs**: Use Vercel CLI: `vercel logs`

### Common Issues

#### Build Failures

**Issue**: "No serverless pages were built"
- **Cause**: Next.js not detecting API routes
- **Solution**: Ensure `apps/api/app/api/**/*.ts` files exist and are properly configured

**Issue**: "Module not found: Can't resolve 'fs'"
- **Cause**: Client app trying to bundle server-only code
- **Solution**: Verify `serverComponentsExternalPackages` in `next.config.js`

#### Runtime Errors

**Issue**: "Invalid token" errors
- **Cause**: `NEXTAUTH_SECRET` mismatch between services
- **Solution**: Ensure all services use the same `NEXTAUTH_SECRET`

**Issue**: CORS errors
- **Cause**: Client/Admin domain not in allowed origins
- **Solution**: Add domain to Railway API's `CORS_ORIGINS` variable

---

## Part 8: CI/CD Workflow

### Git Branch Strategy

- **main**: Production deployments
- **dev**: Development deployments

### Automatic Deployments

1. **Railway**: Automatically deploys on git push to configured branch
2. **Vercel**: Automatically deploys on git push to configured branch

### Manual Deployments

1. **Railway**: Trigger redeploy from Railway Dashboard
2. **Vercel**: Trigger redeploy from Vercel Dashboard or use Vercel CLI

---

## Part 9: Best Practices

### Security

1. **Never commit secrets**: Use platform-specific environment variable systems
2. **Use strong secrets**: JWT and NEXTAUTH secrets should be at least 32 characters
3. **Rotate secrets regularly**: Change secrets periodically
4. **Separate environments**: Use different secrets for production and development
5. **Limit CORS origins**: Only include necessary origins

### Performance

1. **Optimize builds**: Use Turbo for faster monorepo builds
2. **Cache dependencies**: Vercel and Railway cache node_modules
3. **Monitor bundle size**: Use Next.js bundle analyzer
4. **Optimize images**: Use Next.js Image component with proper formats

### Maintenance

1. **Keep dependencies updated**: Regularly update packages
2. **Monitor logs**: Check logs regularly for errors
3. **Test deployments**: Test in development environment before production
4. **Document changes**: Update documentation when making changes

---

## References

### Official Documentation

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Railway Dockerfile Guide](https://docs.railway.app/deploy/dockerfiles)
- [Next.js serverComponentsExternalPackages](https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages)
- [Node.js Package Exports](https://nodejs.org/api/packages.html#exports)

### Related Documentation

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Complete environment variables reference
- [DATABASE_MIGRATION_WORKFLOW.md](./DATABASE_MIGRATION_WORKFLOW.md) - Database migration guide

---

## Support

For issues or questions:
1. Check logs in Railway/Vercel dashboards
2. Review [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for configuration
3. Verify all environment variables are set correctly
4. Check CORS configuration if experiencing API connection issues
