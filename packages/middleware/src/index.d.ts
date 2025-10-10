/**
 * Type declarations for @rentalshop/middleware
 */

export interface AuditMiddlewareConfig {
  methods?: string[];
  includeRoutes?: RegExp[];
  excludeRoutes?: RegExp[];
  logBodies?: boolean;
  maxBodySize?: number;
  logSuccess?: boolean;
  logErrors?: boolean;
  severityMap?: Record<number, 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'>;
}

export interface AuditContext {
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

export interface AuthMiddlewareConfig {
  requiredRoles?: string[];
  allowUnauthenticated?: boolean;
  customAuth?: (user: any, request: any) => boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: any) => string;
}

// Audit exports
export declare function createAuditMiddleware(config?: AuditMiddlewareConfig): any;
export declare function withAuditLogging(handler: any, config?: AuditMiddlewareConfig): any;
export declare function logAuditEvent(action: string, entityType: string, entityId: string, entityName: string, oldValues: any, newValues: any, request: any, user: any, description?: string): Promise<void>;
export declare function captureAuditContext(request: any): Promise<AuditContext>;
export declare function getAuditContext(): AuditContext | undefined;
export declare function getAuditContextById(requestId: string): AuditContext | undefined;
export declare function clearAuditContext(requestId: string): void;
export declare function generateRequestId(): string;

// Rate limiting exports
export declare function createRateLimiter(config: RateLimitConfig): any;
export declare const searchRateLimiter: any;
export declare const apiRateLimiter: any;

// Auth exports
export declare function createAuthMiddleware(config?: AuthMiddlewareConfig): any;
export declare function withAuth(handler: any, config?: AuthMiddlewareConfig): any;
export declare function getUserFromRequest(request: any): any;
export declare const adminAuth: any;
export declare const merchantAuth: any;
export declare const outletAuth: any;
export declare const optionalAuth: any;

// Audit helper
export declare function createAuditHelper(prisma: any): {
  logCreate: (params: any) => Promise<void>;
  logUpdate: (params: any) => Promise<void>;
  logDelete: (params: any) => Promise<void>;
};
