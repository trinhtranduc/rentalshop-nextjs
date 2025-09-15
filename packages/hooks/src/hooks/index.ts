// ============================================================================
// BUSINESS LOGIC HOOKS - Main Exports
// ============================================================================

export { useAuth } from './useAuth';
export { useAuthErrorHandler } from './useAuthErrorHandler';
export { useErrorHandler, useSimpleErrorHandler, useToastHandler, type UseErrorHandlerOptions, type UseErrorHandlerReturn } from './useToast';
export { useProductAvailability } from './useProductAvailability';
export { useThrottledSearch } from './useThrottledSearch';
export { useCurrency, CurrencyProvider } from './useCurrency';
export { usePagination } from './usePagination';
export { useUserManagement, type UseUserManagementOptions } from './useUserManagement';
export { useCustomerManagement, type UseCustomerManagementOptions } from './useCustomerManagement';
export { useProductManagement, type UseProductManagementOptions } from './useProductManagement';
export { useOrderManagement, type UseOrderManagementOptions } from './useOrderManagement';
export { useSubscriptionAccess, useCanPerform, useSubscriptionStatusInfo } from './useSubscriptionAccess';
export { useSubscriptionError, type SubscriptionError, type UseSubscriptionErrorReturn } from './useSubscriptionError';