/**
 * Type declarations for @rentalshop/middleware
 */

interface AuditMiddlewareConfig {
  methods?: string[];
  includeRoutes?: RegExp[];
  excludeRoutes?: RegExp[];
  logBodies?: boolean;
  maxBodySize?: number;
  logSuccess?: boolean;
  logErrors?: boolean;
  severityMap?: Record<number, 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'>;
}

interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  merchantId?: string;
  outletId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

interface AuthMiddlewareConfig {
  requiredRoles?: string[];
  allowUnauthenticated?: boolean;
  customAuth?: (user: any, request: any) => boolean;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: any) => string;
}

// Audit exports
declare function createAuditMiddleware(config?: AuditMiddlewareConfig): any;
declare function withAuditLogging(handler: any, config?: AuditMiddlewareConfig): any;
declare function logAuditEvent(action: string, entityType: string, entityId: string, entityName: string, oldValues: any, newValues: any, request: any, user: any, description?: string): Promise<void>;
declare function captureAuditContext(request: any): Promise<AuditContext>;
declare function getAuditContext(): AuditContext | undefined;
declare function getAuditContextById(requestId: string): AuditContext | undefined;
declare function clearAuditContext(requestId: string): void;
declare function generateRequestId(): string;

// Rate limiting exports
declare function createRateLimiter(config: RateLimitConfig): any;
declare const searchRateLimiter: any;
declare const apiRateLimiter: any;

// Auth exports
declare function createAuthMiddleware(config?: AuthMiddlewareConfig): any;
declare function withAuth(handler: any, config?: AuthMiddlewareConfig): any;
declare function getUserFromRequest(request: any): any;
declare const adminAuth: any;
declare const merchantAuth: any;
declare const outletAuth: any;
declare const optionalAuth: any;

// Audit helper
declare function createAuditHelper(prisma: any): {
  logCreate: (params: any) => Promise<void>;
  logUpdate: (params: any) => Promise<void>;
  logDelete: (params: any) => Promise<void>;
};

export { type AuditContext, type AuditMiddlewareConfig, type AuthMiddlewareConfig, type RateLimitConfig, adminAuth, apiRateLimiter, captureAuditContext, clearAuditContext, createAuditHelper, createAuditMiddleware, createAuthMiddleware, createRateLimiter, generateRequestId, getAuditContext, getAuditContextById, getUserFromRequest, logAuditEvent, merchantAuth, optionalAuth, outletAuth, searchRateLimiter, withAuditLogging, withAuth };
