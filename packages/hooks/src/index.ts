// ============================================================================
// HOOKS PACKAGE - Main Exports
// ============================================================================

// Export all business logic hooks
export * from './hooks/useAuth';
export * from './hooks/useAuthErrorHandler';
export * from './hooks/usePermissions';
export * from './hooks/useCanPerform';
export * from './hooks/useCurrency';
export * from './hooks/useCustomersData';
export * from './hooks/useMerchantsData';
export * from './hooks/useOrdersData';
export * from './hooks/usePagination';
export * from './hooks/usePaymentsData';
export * from './hooks/usePlansData';
export * from './hooks/useProductAvailability';
export * from './hooks/useProductsData';
export * from './hooks/useSubscriptionsData';
export * from './hooks/useSubscriptionError';
export * from './hooks/useSubscriptionStatusInfo';
export * from './hooks/useThrottledSearch';
export * from './hooks/useToast';
export * from './hooks/useTranslation';
export * from './hooks/useLocale';
export * from './hooks/useUserRole';
export * from './hooks/useUsersData';
export * from './hooks/useOptimisticNavigation';
export * from './hooks/useApiError';
export * from './hooks/useGlobalErrorHandler';
export * from './hooks/useTableSelection';

// Modern API utilities
export * from './utils/useDedupedApi';

// Modern filter data hooks
export * from './hooks/useFiltersData';
