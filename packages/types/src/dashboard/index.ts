/**
 * Dashboard types for analytics and reporting
 */

export type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
}

export interface OrderDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

// ============================================================================
// NOTE: OrderData has been moved to order-display.ts for better organization
// Use OrderListItem from @rentalshop/types/orders for order display
// ============================================================================

export interface OrderItemData {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deposit: number;
  notes?: string;
}

export interface IncomeDataPoint {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface IncomeData {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface IncomeDataPoint {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface TodaysFocus {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionRequired: boolean;
  deadline?: string;
  status: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
  // Additional properties that are being used in the code
  totalDeposits: number;
  activeRentals: number;
  overdueRentals: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface DashboardData {
  period: DashboardPeriod;
  stats: DashboardStats;
  orderData: OrderDataPoint[];
  incomeData: IncomeDataPoint[];
  todaysFocus: TodaysFocus[];
  activeTab: string;
}
