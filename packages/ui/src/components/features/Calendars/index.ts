
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
  CalendarData,
  CalendarFilters,
  PickupOrder,
  CalendarDay,
  CalendarEvent,
  CalendarViewMode,
  CalendarNavigationProps,
  CalendarGridProps,
  CalendarSidebarProps,
  CalendarFiltersProps
} from './types';
