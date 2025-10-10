// ============================================================================
// ORDERS FEATURE COMPONENTS (List + Detail)
// ============================================================================

// Main components
export { default as Orders } from './Orders';

// Order list components
export { 
  OrderHeader,
  OrderFilters,
  OrderTable,
  OrderActions,
  OrderStats,
  OrderPagination,
  OrdersLoading,
  OrderDetailLoading
} from './components';

// Order creation components
export { RentalPeriodSelector } from './RentalPeriodSelector';

// Note: Types are imported directly from @rentalshop/types where needed
