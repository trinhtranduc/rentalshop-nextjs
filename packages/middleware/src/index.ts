/**
 * @rentalshop/middleware
 * 
 * Shared middleware utilities for Rental Shop applications
 * 
 * This package provides:
 * - Audit logging middleware
 * - Rate limiting middleware  
 * - Authentication middleware
 * - Request context utilities
 */

// ============================================================================
// AUDIT MIDDLEWARE
// ============================================================================
export * from './audit';

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================
export * from './rate-limit';

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
export * from './auth';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Audit exports
export type { 
  AuditMiddlewareConfig, 
  AuditContext 
} from './audit';

export { 
  createAuditMiddleware, 
  withAuditLogging, 
  logAuditEvent,
  captureAuditContext, 
  getAuditContext, 
  getAuditContextById, 
  clearAuditContext,
  generateRequestId 
} from './audit';

// Rate limiting exports
export { 
  createRateLimiter, 
  searchRateLimiter, 
  apiRateLimiter 
} from './rate-limit';

// Auth exports
export type { AuthMiddlewareConfig } from './auth';
export { 
  createAuthMiddleware, 
  withAuth, 
  getUserFromRequest,
  adminAuth,
  merchantAuth,
  outletAuth,
  optionalAuth
} from './auth';
