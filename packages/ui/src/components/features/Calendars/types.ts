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
