/**
 * Audit Middleware for Next.js API Routes
 * 
 * This middleware automatically logs API requests and responses for audit purposes.
 * It can be applied to individual routes or globally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogger, extractAuditContext, AuditContext } from '@rentalshop/database';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

// Audit middleware configuration
export interface AuditMiddlewareConfig {
  // Which HTTP methods to audit
  methods?: string[];
  // Which routes to audit (regex patterns)
  includeRoutes?: RegExp[];
  // Which routes to exclude (regex patterns)
  excludeRoutes?: RegExp[];
  // Whether to log request/response bodies
  logBodies?: boolean;
  // Maximum body size to log (in bytes)
  maxBodySize?: number;
  // Whether to log successful operations
  logSuccess?: boolean;
  // Whether to log failed operations
  logErrors?: boolean;
  // Custom severity mapping
  severityMap?: Record<number, 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'>;
}

// Default configuration
const defaultConfig: AuditMiddlewareConfig = {
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  includeRoutes: [/^\/api\//],
  excludeRoutes: [/^\/api\/health/, /^\/api\/docs/],
  logBodies: false,
  maxBodySize: 1024, // 1KB
  logSuccess: true,
  logErrors: true,
  severityMap: {
    200: 'INFO',
    201: 'INFO',
    400: 'WARNING',
    401: 'WARNING',
    403: 'WARNING',
    404: 'INFO',
    500: 'ERROR',
    502: 'ERROR',
    503: 'ERROR'
  }
};

// Audit middleware function
export function createAuditMiddleware(config: AuditMiddlewareConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const auditLogger = getAuditLogger(prisma);

  return async function auditMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    let response: NextResponse;
    let user: any = null;
    let requestBody: any = null;
    let responseBody: any = null;

    try {
      // Check if this request should be audited
      if (!shouldAuditRequest(request, finalConfig)) {
        return await next();
      }

      // Extract user information from token
      try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (token) {
          user = await verifyTokenSimple(token);
        }
      } catch (error) {
        // Ignore auth errors for audit purposes
      }

      // Extract request body if needed
      if (finalConfig.logBodies && request.body) {
        try {
          const clonedRequest = request.clone();
          const body = await clonedRequest.text();
          if (body.length <= finalConfig.maxBodySize!) {
            requestBody = JSON.parse(body);
          }
        } catch (error) {
          // Ignore body parsing errors
        }
      }

      // Execute the actual request
      response = await next();

      // Extract response body if needed
      if (finalConfig.logBodies && response.body) {
        try {
          const clonedResponse = response.clone();
          const body = await clonedResponse.text();
          if (body.length <= finalConfig.maxBodySize!) {
            responseBody = JSON.parse(body);
          }
        } catch (error) {
          // Ignore body parsing errors
        }
      }

      // Log the audit event
      await logAuditEventInternal(
        request,
        response,
        user,
        requestBody,
        responseBody,
        Date.now() - startTime,
        finalConfig,
        auditLogger
      );

      return response;

    } catch (error) {
      // Log error events
      if (finalConfig.logErrors) {
        await logErrorEvent(
          request,
          error,
          user,
          requestBody,
          Date.now() - startTime,
          finalConfig,
          auditLogger
        );
      }
      throw error;
    }
  };
}

// Check if request should be audited
function shouldAuditRequest(request: NextRequest, config: AuditMiddlewareConfig): boolean {
  const method = request.method;
  const pathname = request.nextUrl.pathname;

  // Check method
  if (config.methods && !config.methods.includes(method)) {
    return false;
  }

  // Check include routes
  if (config.includeRoutes) {
    const shouldInclude = config.includeRoutes.some(pattern => pattern.test(pathname));
    if (!shouldInclude) {
      return false;
    }
  }

  // Check exclude routes
  if (config.excludeRoutes) {
    const shouldExclude = config.excludeRoutes.some(pattern => pattern.test(pathname));
    if (shouldExclude) {
      return false;
    }
  }

  return true;
}

// Log successful audit events
async function logAuditEventInternal(
  request: NextRequest,
  response: NextResponse,
  user: any,
  requestBody: any,
  responseBody: any,
  duration: number,
  config: AuditMiddlewareConfig,
  auditLogger: any
) {
  if (!config.logSuccess) return;

  const status = response.status;
  const severity = config.severityMap?.[status] || 'INFO';
  
  // Determine entity type and action from the request
  const { entityType, action, entityId } = extractEntityInfo(request, requestBody);
  
  const context = extractAuditContext(request, user);
  context.metadata = {
    ...context.metadata,
    duration,
    status,
    requestBody: config.logBodies ? requestBody : undefined,
    responseBody: config.logBodies ? responseBody : undefined
  };

  await auditLogger.log({
    action,
    entityType,
    entityId,
    entityName: extractEntityName(request, requestBody, responseBody),
    newValues: config.logBodies ? requestBody : undefined,
    severity,
    category: getCategoryFromPath(request.nextUrl.pathname),
    description: `${request.method} ${request.nextUrl.pathname} - ${status}`,
    context
  });
}

// Log error events
async function logErrorEvent(
  request: NextRequest,
  error: any,
  user: any,
  requestBody: any,
  duration: number,
  config: AuditMiddlewareConfig,
  auditLogger: any
) {
  const { entityType, action, entityId } = extractEntityInfo(request, requestBody);
  
  const context = extractAuditContext(request, user);
  context.metadata = {
    ...context.metadata,
    duration,
    error: error.message,
    requestBody: config.logBodies ? requestBody : undefined
  };

  await auditLogger.log({
    action,
    entityType,
    entityId,
    entityName: extractEntityName(request, requestBody),
    severity: 'ERROR',
    category: 'SYSTEM',
    description: `Error in ${request.method} ${request.nextUrl.pathname}: ${error.message}`,
    context
  });
}

// Extract entity information from request
function extractEntityInfo(request: NextRequest, requestBody: any): {
  entityType: string;
  action: string;
  entityId: string;
} {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  
  // Extract entity type from path
  const pathParts = pathname.split('/').filter(Boolean);
  let entityType = 'Unknown';
  let entityId = 'unknown';
  
  if (pathParts.length >= 2) {
    entityType = pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1);
    
    // Try to extract ID from path or body
    if (pathParts.length >= 3) {
      entityId = pathParts[2];
    } else if (requestBody?.id) {
      entityId = requestBody.id;
    } else if (requestBody?.publicId) {
      entityId = requestBody.publicId;
    }
  }
  
  // Map HTTP method to action
  const actionMap: Record<string, string> = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  
  const action = actionMap[method] || 'CUSTOM';
  
  return { entityType, action, entityId };
}

// Extract entity name from request/response
function extractEntityName(request: NextRequest, requestBody: any, responseBody?: any): string {
  // Try to get name from various sources
  if (requestBody?.name) return requestBody.name;
  if (requestBody?.email) return requestBody.email;
  if (requestBody?.title) return requestBody.title;
  if (responseBody?.data?.name) return responseBody.data.name;
  if (responseBody?.data?.email) return responseBody.data.email;
  
  // Fallback to path-based name
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2) {
    return `${pathParts[1]} ${pathParts[2] || 'operation'}`;
  }
  
  return 'Unknown entity';
}

// Get category from path
function getCategoryFromPath(pathname: string): 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' {
  if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/logout')) {
    return 'SECURITY';
  }
  if (pathname.includes('/settings/') || pathname.includes('/admin/')) {
    return 'SYSTEM';
  }
  if (pathname.includes('/orders/') || pathname.includes('/products/') || pathname.includes('/customers/')) {
    return 'BUSINESS';
  }
  return 'GENERAL';
}

// Higher-order function to wrap API route handlers with audit logging
export function withAuditLogging(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: AuditMiddlewareConfig
) {
  const auditMiddleware = createAuditMiddleware(config);
  
  return async function(request: NextRequest): Promise<NextResponse> {
    return auditMiddleware(request, () => handler(request));
  };
}

// Utility function to manually log audit events in route handlers
export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  oldValues: Record<string, any> | undefined,
  newValues: Record<string, any> | undefined,
  request: NextRequest,
  user: any,
  description?: string
) {
  const auditLogger = getAuditLogger(prisma);
  const context = extractAuditContext(request, user);
  
  await auditLogger.log({
    action: action as any,
    entityType,
    entityId,
    entityName,
    oldValues,
    newValues,
    description,
    context
  });
}
