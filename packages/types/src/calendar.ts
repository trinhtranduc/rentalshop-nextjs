// ============================================================================
// CALENDAR TYPES
// ============================================================================

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  type: 'pickup' | 'return' | 'maintenance' | 'other';
  orderId?: number;
  customerName?: string;
  productName?: string;
  notes?: string;
}

export interface CalendarFilters {
  eventType?: string[];
  outletId?: number;
  startDate?: Date;
  endDate?: Date;
  customerId?: number;
  productId?: number;
}

export interface CalendarViewProps {
  events: CalendarEvent[];
  filters?: CalendarFilters;
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  onFilterChange?: (filters: CalendarFilters) => void;
}

export interface CalendarGridProps {
  events: CalendarEvent[];
  view: 'month' | 'week' | 'day';
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
}

export interface CalendarEventFormData {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: 'pickup' | 'return' | 'maintenance' | 'other';
  orderId?: number;
  customerName?: string;
  productName?: string;
  notes?: string;
  color?: string;
}

// Additional calendar types that are being used in the UI
export interface CalendarDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isSelected: boolean;
}

export interface CalendarData {
  events: CalendarEvent[];
  filters: CalendarFilters;
  view: CalendarViewMode;
}

export type CalendarViewMode = 'month' | 'week' | 'day';

export interface CalendarNavigationProps {
  currentDate: Date;
  view: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarViewMode) => void;
}

export interface CalendarSidebarProps {
  events: CalendarEvent[];
  filters: CalendarFilters;
  onFilterChange: (filters: CalendarFilters) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export interface CalendarFiltersProps {
  filters: CalendarFilters;
  onFilterChange: (filters: CalendarFilters) => void;
}

// Pickup order type for calendar
export interface PickupOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  productCount?: number;
  totalAmount?: number;
  pickupDate: Date;
  returnDate: Date;
  status: string;
  outletName?: string;
  notes?: string;
  // 🎯 EXPERT: Calculated fields for better UX
  isOverdue?: boolean;
  duration?: number;
}
