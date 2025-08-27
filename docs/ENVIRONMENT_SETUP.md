# Environment Setup Guide

## Centralized API Configuration

This project uses a centralized API configuration system that automatically handles different environments (local, development, production).

## Environment Variables

### Client App (`apps/client/.env.local`)

```env
# Application Environment
# Options: local, development, production
NEXT_PUBLIC_APP_ENV=local

# API Configuration
# For local development, this should point to your API server
NEXT_PUBLIC_API_URL=http://localhost:3002

# Client App Configuration
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000

# Admin App Configuration (if different)
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
```

### API Server (`apps/api/.env.local`)

```env
# Application Environment
APP_ENV=local

# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET="your-local-jwt-secret-key-change-this"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3002
HOST=localhost

# CORS Origins (comma-separated)
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002"
```

## Environment Detection

The system automatically detects the environment based on:

1. **Explicit Environment Variable**: `NEXT_PUBLIC_APP_ENV` or `APP_ENV`
2. **Fallback**: `NODE_ENV` (development/production)
3. **Default**: `local` for development

## Environment-Specific URLs

### Local Development
- **API Server**: `http://localhost:3002`
- **Client App**: `http://localhost:3000`
- **Admin App**: `http://localhost:3001`

### Development (Staging)
- **API Server**: `https://api.dev.rentalshop.com`
- **Client App**: `https://dev.rentalshop.com`
- **Admin App**: `https://admin.dev.rentalshop.com`

### Production
- **API Server**: `https://api.rentalshop.com`
- **Client App**: `https://rentalshop.com`
- **Admin App**: `https://admin.rentalshop.com`

## Usage in Code

### Import Configuration
```typescript
import { apiUrls, getCurrentEnvironment, isLocal } from '@rentalshop/utils';

// Get current environment
const env = getCurrentEnvironment(); // 'local' | 'development' | 'production'

// Check environment
if (isLocal()) {
  console.log('Running in local environment');
}

// Use centralized API URLs
const response = await fetch(apiUrls.categories.create, {
  method: 'POST',
  body: JSON.stringify(categoryData)
});
```

### API Endpoints
```typescript
// All endpoints are automatically configured
apiUrls.auth.login           // /api/auth/login
apiUrls.categories.list      // /api/categories
apiUrls.categories.create    // /api/categories
apiUrls.categories.update(1) // /api/categories/1
apiUrls.categories.delete(1) // /api/categories/1
```

## Setup Instructions

### 1. Create Environment Files

**Client App:**
```bash
cd apps/client
cp .env.example .env.local
# Edit .env.local with your local configuration
```

**API Server:**
```bash
cd apps/api
cp .env.example .env.local
# Edit .env.local with your local configuration
```

### 2. Set Environment Variables

**For Local Development:**
```env
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_API_URL=http://localhost:3002
```

**For Development (Staging):**
```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=https://api.dev.rentalshop.com
```

**For Production:**
```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=https://api.rentalshop.com
```

### 3. Restart Servers

After updating environment variables, restart your development servers:

```bash
# Stop all servers (Ctrl+C)
# Then restart them

# Terminal 1: API Server
cd apps/api && yarn dev

# Terminal 2: Client App
cd apps/client && yarn dev

# Terminal 3: Admin App (if needed)
cd apps/admin && yarn dev
```

## Benefits

1. **Centralized Configuration**: All API URLs in one place
2. **Environment-Aware**: Automatic URL switching based on environment
3. **Type Safety**: Full TypeScript support for all endpoints
4. **Easy Deployment**: Simple environment variable changes
5. **Consistent URLs**: All API calls use the same base configuration
6. **No Hardcoding**: URLs automatically adapt to environment

## Troubleshooting

### Common Issues

1. **API calls going to wrong port**: Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. **Environment not detected**: Ensure `NEXT_PUBLIC_APP_ENV` is set correctly
3. **CORS errors**: Verify CORS origins in API server configuration
4. **Authentication failures**: Check if API server is running on correct port

### Debug Commands

```bash
# Check current environment
echo $NEXT_PUBLIC_APP_ENV

# Check API URL
echo $NEXT_PUBLIC_API_URL

# Verify API server is running
curl http://localhost:3002/api/health

# Check client app environment
cd apps/client && cat .env.local
```
