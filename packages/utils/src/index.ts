// ============================================================================
// UTILS PACKAGE EXPORTS - SIMPLIFIED STRUCTURE
// ============================================================================
// NOTE: Server-side utilities (tenant-utils, etc.) are exported from './api'
// Import from '@rentalshop/utils/api' for server-only code
// Import from '@rentalshop/utils' for client-safe utilities

// API utilities (client-safe API clients - server-only code is in ./api subpath)
// Note: Server-only utilities (getTenantDbFromRequest, withTenantDb) are NOT exported here
// Use '@rentalshop/utils/api' for server-only utilities like getTenantDbFromRequest
// Client-safe API clients are exported here:
export * from './api/auth';
export * from './api/products';
export * from './api/customers';
export * from './api/orders';
export * from './api/outlets';
export * from './api/merchants';
export * from './api/analytics';
export * from './api/categories';
export * from './api/notifications';
export * from './api/profile';
export * from './api/users';
export * from './api/plans';
export * from './api/billing-cycles';
export * from './api/payments';
export * from './api/audit-logs';
export * from './api/settings';
export * from './api/subscriptions';
export * from './api/system';
export * from './api/calendar';
export * from './api/upload';
export * from './api/aws-s3';
export * from './api/response-builder';

// Configuration
export * from './config';

// Core utilities (everything else)
export * from './core';

// Unified Error handling (consolidated from api-errors.ts)
export * from './core/errors';
export * from './core/error-display';

// Breadcrumb utilities
export * from './breadcrumbs';

// Performance monitoring
export * from './performance';

// Email service
export * from './services/email';

