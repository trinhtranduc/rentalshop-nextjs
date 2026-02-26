/**
 * Server-only utilities
 * 
 * This file exports utilities that should only be used on the server-side
 * (API routes, server components, etc.) and cannot be used in client-side code.
 * 
 * These utilities use Node.js modules that are not available in the browser:
 * - fs (file system)
 * - worker_threads
 * - pino (uses worker_threads)
 * - @prisma/client (database client)
 * - @rentalshop/database (database operations)
 */

// File logger utilities (Pino) - SERVER ONLY
export * from './core/logger';

// Database-dependent utilities - SERVER ONLY
// These import @rentalshop/database and Prisma Client, which cannot run in browser
export * from './core/subscription-manager';
export * from './core/audit-helper';
export * from './core/order-number-manager';
export * from './core/request-logger';

// AWS S3 utilities - SERVER ONLY
// These use AWS SDK and Node.js modules (fs, stream) which cannot run in browser
export * from './api/aws-s3';

// CORS utilities - SERVER ONLY
// These use NextRequest type which is only available in server-side code
export * from './cors';

// API route helpers - SERVER ONLY
// These use NextRequest and NextResponse which are only available in server-side code
export * from './api/route-helpers';

// Validation utilities with server-only dependencies (NextResponse, prisma) - SERVER ONLY
export { 
  assertPlanLimit, 
  checkPlanLimitIfNeeded,
  getCurrentEntityCounts,
  getPlanLimitsInfo,
  validatePlanLimits,
  validatePlatformAccess,
  validateProductPublicCheckAccess,
  validateAddonDeletion
} from './core/validation';
