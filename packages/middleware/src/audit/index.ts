/**
 * Audit Middleware Exports
 * 
 * Centralized exports for all audit-related middleware functionality
 */

export * from './audit';
export * from './audit-context';

// Re-export commonly used types and functions
export type { AuditMiddlewareConfig } from './audit';
export type { AuditContext } from './audit-context';
export { 
  createAuditMiddleware, 
  withAuditLogging, 
  logAuditEvent 
} from './audit';
export { 
  captureAuditContext, 
  getAuditContext, 
  getAuditContextById, 
  clearAuditContext,
  generateRequestId 
} from './audit-context';
