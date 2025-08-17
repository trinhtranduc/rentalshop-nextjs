export interface PickupOrder {
  id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  outlet: {
    name: string;
    address?: string;
  };
  pickupPlanAt: string;
  returnPlanAt: string;
  totalAmount: number;
  status: string;
  orderItems: Array<{
    product: {
      name: string;
      barcode?: string;
    };
    quantity: number;
  }>;
}

export interface CalendarFilters {
  month: number;
  year: number;
  status: string;
  outlet: string;
  viewMode: 'pickup' | 'return' | 'both';
}

export interface CalendarData {
  currentMonth: number;
  currentYear: number;
  selectedDate: Date | null;
  totalPickups: number;
  totalReturns: number;
  days: CalendarDay[];
}

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  pickupOrders: PickupOrder[];
  returnOrders: PickupOrder[];
  hasEvents: boolean;
  // Additional properties needed by OrdersList
  orders: PickupOrder[];
  pickupCount: number;
  returnCount: number;
}

export interface CalendarEvent {
  id: string;
  type: 'pickup' | 'return';
  order: PickupOrder;
  time: string;
  status: string;
}

export interface CalendarViewMode {
  type: 'month' | 'week' | 'day';
  showPickups: boolean;
  showReturns: boolean;
  showBoth: boolean;
}

export interface CalendarNavigationProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDateSelect: (date: Date) => void;
}

export interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  orders: PickupOrder[];
  onDateClick: (date: Date) => void;
  onOrderClick: (order: PickupOrder) => void;
}

export interface CalendarSidebarProps {
  selectedDate: Date | null;
  orders: PickupOrder[];
  onOrderClick: (order: PickupOrder) => void;
  onClose: () => void;
}

export interface CalendarFiltersProps {
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  outlets: Array<{ id: string; name: string }>;
}
