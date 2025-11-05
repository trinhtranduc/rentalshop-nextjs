// ============================================================================
// API CLIENT EXPORTS - SERVER-SIDE ONLY
// ============================================================================

// Core API utilities are exported from the main utils package

// Server-side only utilities (cannot be used in client-side code)
// These utilities import PostgreSQL and other Node.js-only modules
export { getTenantDbFromRequest, withTenantDb } from '../core/tenant-utils';

// Subscription manager (server-only - imports PostgreSQL)
export * from '../core/subscription-manager';
export type {
  SubscriptionRenewalConfig,
  SubscriptionRenewalResult,
  RenewalStats
} from '../core/subscription-manager';

// Validation (server-only - imports PostgreSQL)
export * from '../core/validation';
export { assertPlanLimit } from '../core/validation';

// Server-safe utilities (no React imports)
// Re-export from server-safe core module
export * from '../core/server';

// Domain-specific API clients
export * from './auth';
export * from './products';
export * from './customers';
export * from './orders';
export * from './outlets';
export * from './merchants';
export * from './analytics';
export * from './categories';
export * from './notifications';
export * from './profile';
export * from './users';
export * from './plans';
export * from './billing-cycles';
export * from './payments';
export * from './audit-logs';
export * from './settings';
export * from './subscriptions';
export * from './system';
export * from './calendar';
export * from './upload';
export * from './aws-s3';
export * from './response-builder';
