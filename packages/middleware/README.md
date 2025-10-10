# @rentalshop/middleware

Shared middleware utilities for Rental Shop applications.

## Features

- **Audit Logging**: Automatic API request/response logging for compliance and debugging
- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **Authentication**: Role-based authentication and authorization middleware
- **Request Context**: Utilities for capturing and managing request context

## Installation

```bash
# This package is part of the monorepo workspace
# No separate installation needed
```

## Usage

### Audit Logging

```typescript
import { createAuditMiddleware, captureAuditContext } from '@rentalshop/middleware';

// Wrap API route handlers with audit logging
export const POST = createAuditMiddleware({
  methods: ['POST', 'PUT', 'DELETE'],
  logBodies: true,
  maxBodySize: 2048
})(async (request: NextRequest) => {
  // Your route handler logic
});

// Or capture context manually
export async function POST(request: NextRequest) {
  const auditContext = await captureAuditContext(request);
  // Your route handler logic
}
```

### Rate Limiting

```typescript
import { createRateLimiter, searchRateLimiter } from '@rentalshop/middleware';

// Create custom rate limiter
const customLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

// Use pre-configured rate limiters
export async function GET(request: NextRequest) {
  const rateLimitResult = searchRateLimiter(request);
  if (rateLimitResult) {
    return rateLimitResult; // Rate limit exceeded
  }
  // Continue with request
}
```

### Authentication

```typescript
import { createAuthMiddleware, withAuth, adminAuth } from '@rentalshop/middleware';

// Create custom auth middleware
const customAuth = createAuthMiddleware({
  requiredRoles: ['ADMIN', 'MERCHANT']
});

// Use pre-configured auth middleware
export const POST = adminAuth(async (request: NextRequest) => {
  // Only admins can access this route
});

// Or use higher-order function
export const PUT = withAuth(async (request: NextRequest) => {
  // Your route handler
}, { requiredRoles: ['ADMIN'] });
```

## API Reference

### Audit Middleware

#### `createAuditMiddleware(config?)`

Creates audit middleware with the specified configuration.

**Configuration:**
- `methods`: HTTP methods to audit (default: `['POST', 'PUT', 'PATCH', 'DELETE']`)
- `includeRoutes`: Regex patterns for routes to include
- `excludeRoutes`: Regex patterns for routes to exclude
- `logBodies`: Whether to log request/response bodies (default: `false`)
- `maxBodySize`: Maximum body size to log in bytes (default: `1024`)
- `logSuccess`: Whether to log successful operations (default: `true`)
- `logErrors`: Whether to log failed operations (default: `true`)

#### `captureAuditContext(request)`

Captures request context including user information, IP address, and metadata.

### Rate Limiting

#### `createRateLimiter(config)`

Creates a rate limiter with the specified configuration.

**Configuration:**
- `windowMs`: Time window in milliseconds (default: `60000`)
- `maxRequests`: Maximum requests per window (default: `10`)
- `keyGenerator`: Function to generate unique keys (default: IP-based)

#### Pre-configured Rate Limiters

- `searchRateLimiter`: 20 requests per 30 seconds
- `apiRateLimiter`: 100 requests per minute

### Authentication

#### `createAuthMiddleware(config)`

Creates authentication middleware with the specified configuration.

**Configuration:**
- `requiredRoles`: Array of required roles
- `allowUnauthenticated`: Whether to allow unauthenticated access
- `customAuth`: Custom authorization function

#### Pre-configured Auth Middleware

- `adminAuth`: Requires ADMIN role
- `merchantAuth`: Requires ADMIN or MERCHANT role
- `outletAuth`: Requires any outlet-level role
- `optionalAuth`: Allows unauthenticated access

## Best Practices

1. **Use appropriate middleware for each route**: Apply audit logging to sensitive operations, rate limiting to public endpoints, and authentication to protected routes.

2. **Configure middleware appropriately**: Set appropriate limits and logging levels based on your application's needs.

3. **Handle errors gracefully**: Middleware should not break your application if audit logging or rate limiting fails.

4. **Use pre-configured middleware**: Leverage the pre-configured middleware for common use cases.

## Examples

### Complete API Route with All Middleware

```typescript
import { 
  createAuditMiddleware, 
  searchRateLimiter, 
  adminAuth 
} from '@rentalshop/middleware';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = searchRateLimiter(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }
  
  // Your route logic
  return NextResponse.json({ data: 'success' });
}

export const POST = createAuditMiddleware({
  logBodies: true,
  maxBodySize: 2048
})(adminAuth(async (request: NextRequest) => {
  // Only admins can access this route
  // All requests are audited
  // Request/response bodies are logged
  
  const body = await request.json();
  // Your route logic
  return NextResponse.json({ success: true });
}));
```

## Development

```bash
# Build the package
yarn build

# Watch for changes
yarn dev

# Type check
yarn type-check
```
