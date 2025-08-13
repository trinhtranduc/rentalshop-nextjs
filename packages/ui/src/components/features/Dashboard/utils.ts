import { DashboardData, DashboardStats, OrderData, IncomeData } from './types';

export const calculateGrowthRate = (current: number, previous: number): string => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const growth = ((current - previous) / previous) * 100;
  return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const getPeriodLabel = (period: string): string => {
  const labels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  };
  return labels[period as keyof typeof labels] || period;
};

export const aggregateOrderData = (orders: OrderData[]): DashboardStats => {
  const totalOrders = orders.reduce((sum, order) => sum + order.orders, 0);
  const totalRevenue = orders.reduce((sum, order) => sum + order.revenue, 0);
  
  return {
    totalOrders,
    totalRevenue,
    totalCustomers: 0, // Would need customer data
    totalProducts: 0,  // Would need product data
    pendingOrders: 0,  // Would need order status data
    completedOrders: 0 // Would need order status data
  };
};

export const aggregateIncomeData = (income: IncomeData[]): { totalIncome: number; totalExpenses: number } => {
  const totalIncome = income.reduce((sum, item) => sum + item.income, 0);
  const totalExpenses = income.reduce((sum, item) => sum + item.expenses, 0);
  
  return { totalIncome, totalExpenses };
};

export const sortByDate = <T extends { date: string }>(data: T[]): T[] => {
  return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getTopPerformers = <T extends { value: number }>(data: T[], limit: number = 5): T[] => {
  return [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return (part / total) * 100;
};

export const isPositiveChange = (change: string): boolean => {
  return change.startsWith('+');
};
