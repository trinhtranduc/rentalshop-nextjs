// ============================================================================
// UTILS PACKAGE EXPORTS - SIMPLIFIED STRUCTURE
// ============================================================================

// API utilities
export * from './api';
export * from './api/upload';

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

// Sync utilities
export * from './sync/imageSync';
export * from './sync/oldServerSync';
export * from './sync/transformers';

// Import utilities
export * from './import/validator';

// Plan features utilities
export * from './plan-features';

// S3 path helper utilities
export * from './utils/s3-path-helper';

// Product image helper utilities
export * from './utils/product-image-helpers';

