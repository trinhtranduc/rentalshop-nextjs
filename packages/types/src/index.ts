// ============================================================================
// TYPES PACKAGE EXPORTS - CONSOLIDATED & DRY
// ============================================================================

// ============================================================================
// CORE ENTITIES - CONSOLIDATED (PRIMARY EXPORTS)
// ============================================================================
export * from './entities';

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================
// Note: Auth types are now consolidated in entities/user.ts
// These exports are maintained for backward compatibility
export * from './auth/permissions';

// ============================================================================
// BUSINESS DOMAIN TYPES
// ============================================================================
export * from './plans';
export * from './subscription';
export * from './settings';

// ============================================================================
// INTERNATIONALIZATION (i18n)
// ============================================================================
export * from './i18n';

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================
export * from './dashboard';
export * from './calendar';

// ============================================================================
// COMMON UTILITIES
// ============================================================================
// Note: Common types are now consolidated in entities/common/base.ts
// These exports are maintained for backward compatibility
export * from './common/currency';
export * from './common/search';

// ============================================================================
// PLATFORM DETECTION
// ============================================================================
export * from './platform';

// ============================================================================
// LEGACY SUPPORT - DEPRECATED
// ============================================================================
// These exports are maintained for backward compatibility
// Consider migrating to the new consolidated types above

// Legacy individual exports (deprecated - use entities/* instead)
// Note: These are commented out to avoid export conflicts
// export * from './user-data'; // DEPRECATED: Use entities/user instead
// export * from './outlet-data'; // DEPRECATED: Use entities/outlet instead
// export * from './merchants'; // DEPRECATED: Use entities/merchant instead
// export * from './product-view'; // DEPRECATED: Use entities/product instead
// export * from './order-detail'; // DEPRECATED: Use entities/order instead