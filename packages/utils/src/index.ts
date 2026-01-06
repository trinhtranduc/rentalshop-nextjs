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
// Export Excel validator types and functions (from validators.ts) - use export * to include generic types
export * from './import/validators';
// Export JSON validator types with different names to avoid conflicts (from validator.ts)
export type {
  ImportValidationError as JsonImportValidationError,
  ImportValidationResult as JsonImportValidationResult
} from './import/validator';
export { validateImportData } from './import/validator';
// Export other import utilities
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

