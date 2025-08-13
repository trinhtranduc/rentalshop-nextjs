export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface OrderData {
  date: string;
  orders: number;
  revenue: number;
}

export interface IncomeData {
  date: string;
  income: number;
  expenses: number;
}

export interface TodaysFocus {
  priority: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  deadline?: string;
}

export interface DashboardData {
  period: 'today' | 'week' | 'month' | 'year';
  stats: DashboardStats;
  orderData: OrderData[];
  incomeData: IncomeData[];
  todaysFocus: TodaysFocus[];
  activeTab: string;
}

export interface DashboardPeriod {
  value: string;
  label: string;
  isActive: boolean;
}

export interface DashboardAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline';
  onClick: () => void;
}
