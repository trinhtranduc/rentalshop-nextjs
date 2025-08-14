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

export interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  pickupCount: number;
  returnCount: number;
  orders: PickupOrder[];
}

export interface CalendarFilters {
  month: number;
  year: number;
  status: string;
  outlet: string;
  viewMode: 'pickup' | 'return' | 'both';
}

export interface CalendarData {
  days: CalendarDay[];
  totalPickups: number;
  totalReturns: number;
  currentMonth: number;
  currentYear: number;
  selectedDate: Date | null;
}

export interface CalendarViewMode {
  value: 'month' | 'week' | 'day';
  label: string;
  icon: string;
}

export interface CalendarAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline' | 'destructive';
  onClick: (orderId: string) => void;
}
