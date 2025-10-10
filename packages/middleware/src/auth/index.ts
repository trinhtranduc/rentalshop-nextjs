/**
 * Authentication Middleware Exports
 * 
 * Centralized exports for authentication and authorization functionality
 */

export * from './auth';

// Re-export commonly used functions and types
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
