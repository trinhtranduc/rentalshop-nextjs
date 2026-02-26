# Environment Variables Documentation

This document describes all required and optional environment variables for deploying the Rental Shop Next.js monorepo across Railway (API) and Vercel (Client/Admin).

## Overview

The monorepo consists of three applications:
- **API Service** (Railway): Backend API with database access
- **Client App** (Vercel): Customer-facing rental shop application
- **Admin App** (Vercel): Admin dashboard for managing the rental business

Each application requires different environment variables based on its role and deployment platform.

---

## Railway API Service

### Required Variables

#### Database
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```
- **Description**: PostgreSQL connection string for Prisma Client
- **Source**: Railway automatically provides this when PostgreSQL service is connected
- **Format**: `${{Postgres.DATABASE_URL}}` (Railway variable reference)

#### Authentication
```bash
JWT_SECRET=your-32-character-secret-key-here
NEXTAUTH_SECRET=your-32-character-secret-key-here
```
- **Description**: Secrets for JWT token generation and NextAuth.js
- **Requirements**: 
  - Minimum 32 characters
  - Must be the same across all services (API, Client, Admin) for token validation
- **Security**: Never commit to git, use Railway Variables

#### CORS Configuration
```bash
CORS_ORIGINS=https://anyrent.shop,https://admin.anyrent.shop,https://adminvercel.anyrent.shop,https://dev.anyrent.shop,https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
```
- **Description**: Comma-separated list of allowed origins for CORS requests
- **Format**: No spaces, comma-separated URLs
- **Note**: Base origins are hardcoded in `apps/api/lib/cors.ts`, this variable adds additional origins

#### Node Environment
```bash
NODE_ENV=production
```
- **Description**: Node.js environment mode
- **Values**: `production` (production), `development` (dev environment)
- **Default**: Set by Railway based on environment

### Optional Variables

#### AWS S3 Configuration (for image uploads)
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_CLOUDFRONT_DOMAIN=https://your-cloudfront-domain.cloudfront.net
```
- **Description**: AWS credentials for S3 image storage and CloudFront CDN
- **Required**: Only if using image upload features

#### Email Provider
```bash
EMAIL_PROVIDER=console
```
- **Description**: Email service provider
- **Values**: `console` (log to console), `ses` (AWS SES), `smtp` (SMTP server)
- **Default**: `console`

#### Image Search (ML Features)
```bash
IMAGE_SEARCH_MIN_SIMILARITY=0.5
PYTHON_EMBEDDING_API_URL=http://localhost:8000
QDRANT_URL=http://localhost:6333
```
- **Description**: Configuration for AI-powered image search features
- **Required**: Only if using image search functionality

#### Client URL (for email links)
```bash
CLIENT_URL=https://anyrent.shop
NEXT_PUBLIC_CLIENT_URL=https://anyrent.shop
```
- **Description**: Base URL for client application (used in email links)
- **Default**: `https://dev.anyrent.shop` (development), `https://anyrent.shop` (production)

#### Build Configuration
```bash
SKIP_ENV_VALIDATION=true
RAILWAY_ENVIRONMENT=production
```
- **Description**: 
  - `SKIP_ENV_VALIDATION`: Skip environment variable validation during build
  - `RAILWAY_ENVIRONMENT`: Railway environment name (automatically set by Railway)

---

## Vercel Client App

### Required Variables

#### API Configuration
```bash
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
```
- **Description**: Base URL for Railway API service
- **Production**: `https://api.anyrent.shop`
- **Development**: `https://dev-api.anyrent.shop`
- **Local**: `http://localhost:3002`

#### Authentication
```bash
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=https://anyrent.shop
```
- **Description**: 
  - `NEXTAUTH_SECRET`: Must match Railway API `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`: Base URL of the client app (for OAuth callbacks)
- **Security**: Never commit to git, use Vercel Environment Variables

#### Node Environment
```bash
NODE_ENV=production
```
- **Description**: Node.js environment mode
- **Default**: Set by Vercel automatically

#### Client URL
```bash
NEXT_PUBLIC_CLIENT_URL=https://anyrent.shop
```
- **Description**: Base URL for the client application (used in sitemap, metadata)
- **Production**: `https://anyrent.shop`
- **Development**: `https://dev.anyrent.shop`

### Optional Variables

#### Build Configuration
```bash
SKIP_ENV_VALIDATION=true
```
- **Description**: Skip environment variable validation during build
- **Default**: Not set (validation enabled)

---

## Vercel Admin App

### Required Variables

#### API Configuration
```bash
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
```
- **Description**: Base URL for Railway API service
- **Production**: `https://api.anyrent.shop`
- **Development**: `https://dev-api.anyrent.shop`
- **Local**: `http://localhost:3002`

#### Authentication
```bash
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=https://adminvercel.anyrent.shop
```
- **Description**: 
  - `NEXTAUTH_SECRET`: Must match Railway API `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`: Base URL of the admin app (for OAuth callbacks)
- **Security**: Never commit to git, use Vercel Environment Variables

#### Node Environment
```bash
NODE_ENV=production
```
- **Description**: Node.js environment mode
- **Default**: Set by Vercel automatically

### Optional Variables

#### Build Configuration
```bash
SKIP_ENV_VALIDATION=true
```
- **Description**: Skip environment variable validation during build
- **Default**: Not set (validation enabled)

---

## Environment-Specific Configurations

### Production Environment

#### Railway API
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
CORS_ORIGINS=https://anyrent.shop,https://admin.anyrent.shop,https://adminvercel.anyrent.shop
JWT_SECRET=<32-char-secret>
NEXTAUTH_SECRET=<32-char-secret>
CLIENT_URL=https://anyrent.shop
```

#### Vercel Client
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
NEXTAUTH_SECRET=<same-as-railway>
NEXTAUTH_URL=https://anyrent.shop
NEXT_PUBLIC_CLIENT_URL=https://anyrent.shop
```

#### Vercel Admin
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.anyrent.shop
NEXTAUTH_SECRET=<same-as-railway>
NEXTAUTH_URL=https://adminvercel.anyrent.shop
```

### Development Environment

#### Railway API
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=development
CORS_ORIGINS=https://dev.anyrent.shop,https://dev-admin.anyrent.shop,https://dev-adminvercel.anyrent.shop
JWT_SECRET=<32-char-secret>
NEXTAUTH_SECRET=<32-char-secret>
CLIENT_URL=https://dev.anyrent.shop
```

#### Vercel Client
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
NEXTAUTH_SECRET=<same-as-railway>
NEXTAUTH_URL=https://dev.anyrent.shop
NEXT_PUBLIC_CLIENT_URL=https://dev.anyrent.shop
```

#### Vercel Admin
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop
NEXTAUTH_SECRET=<same-as-railway>
NEXTAUTH_URL=https://dev-adminvercel.anyrent.shop
```

---

## Setup Instructions

### Railway API Setup

1. Go to Railway Dashboard → Your Project → API Service
2. Navigate to **Variables** tab
3. Add all required variables listed above
4. For `DATABASE_URL`, use Railway's variable reference: `${{Postgres.DATABASE_URL}}`
5. Ensure `NODE_ENV` matches your environment (production/development)

### Vercel Client Setup

1. Go to Vercel Dashboard → Your Project → Client App
2. Navigate to **Settings** → **Environment Variables**
3. Add all required variables for **Production**, **Preview**, and **Development** environments
4. Ensure `NEXT_PUBLIC_API_URL` points to the correct Railway API URL
5. Ensure `NEXTAUTH_SECRET` matches Railway API's `NEXTAUTH_SECRET`

### Vercel Admin Setup

1. Go to Vercel Dashboard → Your Project → Admin App
2. Navigate to **Settings** → **Environment Variables**
3. Add all required variables for **Production**, **Preview**, and **Development** environments
4. Ensure `NEXT_PUBLIC_API_URL` points to the correct Railway API URL
5. Ensure `NEXTAUTH_SECRET` matches Railway API's `NEXTAUTH_SECRET`
6. Set `NEXTAUTH_URL` to the admin app's domain

---

## Security Best Practices

1. **Never commit secrets to git**: All secrets should be stored in platform-specific environment variable systems
2. **Use strong secrets**: JWT and NEXTAUTH secrets should be at least 32 characters, randomly generated
3. **Rotate secrets regularly**: Change secrets periodically, especially if compromised
4. **Separate environments**: Use different secrets for production and development
5. **Limit CORS origins**: Only include necessary origins in `CORS_ORIGINS`
6. **Use Railway variable references**: For `DATABASE_URL`, use `${{Postgres.DATABASE_URL}}` instead of hardcoding

---

## Troubleshooting

### Common Issues

#### "Invalid token" errors
- **Cause**: `NEXTAUTH_SECRET` or `JWT_SECRET` mismatch between services
- **Solution**: Ensure all services (Railway API, Vercel Client, Vercel Admin) use the same secrets

#### CORS errors
- **Cause**: Client/Admin domain not in `CORS_ORIGINS` or base origins list
- **Solution**: Add the domain to Railway API's `CORS_ORIGINS` variable

#### "Database connection failed"
- **Cause**: `DATABASE_URL` not set or incorrect
- **Solution**: Verify `DATABASE_URL` in Railway Variables, ensure PostgreSQL service is connected

#### "API URL not found"
- **Cause**: `NEXT_PUBLIC_API_URL` not set in Vercel
- **Solution**: Add `NEXT_PUBLIC_API_URL` to Vercel Environment Variables

---

## References

- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
