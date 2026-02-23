// ============================================================================
// API CLIENT EXPORTS
// ============================================================================

// Core API utilities are exported from the main utils package

// Domain-specific API clients
export * from './auth';
export * from './products';
export * from './customers';
export * from './orders';
export * from './outlets';
export * from './bank-accounts';
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
export * from './request-logs';
export * from './settings';
export * from './subscriptions';
export * from './plan-limit-addons';
export * from './system';
export * from './calendar';
export * from './upload';
// aws-s3.ts is server-only (uses AWS SDK and Node.js modules) - exported from server.ts
export * from './response-builder';
export * from './route-helpers';
export * from './referrals';
export * from './posts';