// ============================================================================
// API CLIENT EXPORTS - SERVER-SIDE ONLY
// ============================================================================

// Core API utilities are exported from the main utils package

// Server-side only utilities (cannot be used in client-side code)
// These utilities import PostgreSQL and other Node.js-only modules
export { getTenantDbFromRequest, withTenantDb } from '../core/tenant-utils';

// Subscription manager (server-only - imports PostgreSQL)
// Import all functions explicitly
import {
  SubscriptionManager as SM,
  validateSubscriptionAccess as _validateSubscriptionAccess,
  checkSubscriptionStatus as _checkSubscriptionStatus,
  shouldThrowPlanLimitError as _shouldThrowPlanLimitError,
  getPlanLimitError as _getPlanLimitError,
  getSubscriptionError as _getSubscriptionError,
  canPerformOperation as _canPerformOperation,
  getPlanLimitErrorMessage as _getPlanLimitErrorMessage,
  getAllowedOperations as _getAllowedOperations,
  calculateSubscriptionPeriod as _calculateSubscriptionPeriod,
  calculateNewBillingDate as _calculateNewBillingDate,
  isSubscriptionExpired as _isSubscriptionExpired,
  isGracePeriodExceeded as _isGracePeriodExceeded,
  validateForRenewal as _validateForRenewal,
  getSubscriptionStatusPriority as _getSubscriptionStatusPriority
} from '../core/subscription-manager';

// Re-export with explicit names to ensure they're included in final bundle
// Using explicit assignments forces esbuild to include them even if they point to the same function
export const SubscriptionManager = SM;
export const validateSubscriptionAccess = _validateSubscriptionAccess;
export const checkSubscriptionStatus = _checkSubscriptionStatus;
export const shouldThrowPlanLimitError = _shouldThrowPlanLimitError;
export const getPlanLimitError = _getPlanLimitError;
export const getSubscriptionError = _getSubscriptionError;
export const canPerformOperation = _canPerformOperation;
export const getPlanLimitErrorMessage = _getPlanLimitErrorMessage;
export const getAllowedOperations = _getAllowedOperations;
export const calculateSubscriptionPeriod = _calculateSubscriptionPeriod;
export const calculateNewBillingDate = _calculateNewBillingDate;
export const isSubscriptionExpired = _isSubscriptionExpired;
export const isGracePeriodExceeded = _isGracePeriodExceeded;
export const validateForRenewal = _validateForRenewal;
export const getSubscriptionStatusPriority = _getSubscriptionStatusPriority;

// Note: formatSubscriptionPeriod and getSubscriptionStatusBadge are client-only
// and exported from main package (@rentalshop/utils), not from API package

export type {
  SubscriptionPeriod,
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
