// ============================================================================
// CLIENT-SIDE UTILITIES - React Components and Hooks Only
// ============================================================================
// This file exports React components and hooks that should only be used in client-side code
// DO NOT import this in server-side code (API routes, server components)

// UI utilities with React components
export * from './core/badge-utils';
export * from './core/customer-utils';
export * from './core/product-utils';
export * from './core/user-utils';

// Date formatting hooks (require React context)
export * from './client-date-hooks';

