
// ============================================================================
// CALENDAR FEATURE COMPONENTS
// ============================================================================
export { Calendars } from './Calendars';

// Export all components for easy access
export * from './components';

// ============================================================================
// CALENDAR TYPES - Re-exported to avoid circular dependency
// ============================================================================
export type { 
  CalendarFilters,
  CalendarEvent,
  CalendarViewProps,
  CalendarGridProps,
  CalendarEventFormData
} from './types';

// Export PickupOrder from @rentalshop/types
export type { PickupOrder } from '@rentalshop/types';
