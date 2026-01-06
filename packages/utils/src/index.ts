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
// Note: validator.ts exports are for JSON imports (different use case)
// Excel imports use validators.ts which is exported via './import'
// Explicitly export to avoid type conflicts between validators.ts and validator.ts
export type {
  ImportValidationError,
  ImportValidationResult
} from './import/validators';
export {
  CUSTOMER_COLUMN_MAPPING,
  PRODUCT_COLUMN_MAPPING,
  validateCustomers,
  validateProducts
} from './import/validators';
export type {
  ImportValidationError as JsonImportValidationError,
  ImportValidationResult as JsonImportValidationResult
} from './import/validator';
export { validateImportData } from './import/validator';
export * from './import/excel-parser';
export * from './import/sample-generator';

// Contentful utilities (Blog CMS)
export * from './contentful';

// Plan features utilities
export * from './plan-features';

// S3 path helper utilities
export * from './utils/s3-path-helper';

// Product image helper utilities (server-only functions exported separately)
export { 
  parseProductImages, 
  normalizeImagesInput, 
  combineProductImages,
  extractKeyFromImageUrl,
  extractStagingKeysFromUrls,
  mapStagingUrlsToProductionUrls
} from './utils/product-image-helpers';

