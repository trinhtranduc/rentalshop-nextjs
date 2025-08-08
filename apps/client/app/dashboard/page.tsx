'use client';

import React, { useState, useEffect } from 'react';
import { 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Package,
  PackageCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Truck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays
} from 'lucide-react';
import { 
  CardClean, 
  CardHeaderClean, 
  CardTitleClean, 
  CardContentClean,
  ButtonClean,
  DashboardWrapperClean,
  SimpleList,
  IncomeChart,
  OrderChart
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================
interface DashboardStats {
  // Today's Operational Metrics
  todayRevenue: number;
  todayRentals: number;
  activeRentals: number;
  todayPickups: number;
  todayReturns: number;
  overdueItems: number;
  productUtilization: number;
  
  // Monthly/Yearly Strategic Metrics
  totalRevenue: number;
  totalRentals: number;
  completedRentals: number;
  customerGrowth: number;
  futureRevenue: number;
  revenueGrowth: number;
  customerBase: number;
}

interface RentalStatusData {
  status: string;
  count: number;
  color: string;
}

interface ProductUtilizationData {
  category: string;
  rented: number;
  available: number;
  maintenance: number;
}

interface RevenueData {
  period: string;
  actual: number;
  projected: number;
}

interface RentalTrendData {
  period: string;
  rentals: number;
  revenue: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  rentalCount: number;
  revenue: number;
  availability: number;
  image: string;
}

interface TopCustomer {
  id: string;
  name: string;
  location: string;
  rentalCount: number;
  totalSpent: number;
  lastRental: string;
  avatar: string;
}

interface RecentRental {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  rentalType: string;
  createdAt: string;
  productCount: number;
  pickupDate?: string;
  returnDate?: string;
}

interface OperationalAlert {
  id: string;
  type: 'overdue' | 'low_stock' | 'maintenance' | 'payment' | 'schedule';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  time: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================
const mockTodayStats: DashboardStats = {
  todayRevenue: 1543.25,
  todayRentals: 12,
  activeRentals: 45,
  todayPickups: 8,
  todayReturns: 5,
  overdueItems: 3,
  productUtilization: 78,
  totalRevenue: 1543.25,
  totalRentals: 12,
  completedRentals: 8,
  customerGrowth: 2,
  futureRevenue: 2500,
  revenueGrowth: 15,
  customerBase: 0
};

const mockMonthStats: DashboardStats = {
  todayRevenue: 0,
  todayRentals: 0,
  activeRentals: 89,
  todayPickups: 0,
  todayReturns: 0,
  overdueItems: 3,
  productUtilization: 78,
  totalRevenue: 45678.90,
  totalRentals: 156,
  completedRentals: 142,
  customerGrowth: 23,
  futureRevenue: 15000,
  revenueGrowth: 8,
  customerBase: 0
};

const mockYearStats: DashboardStats = {
  todayRevenue: 0,
  todayRentals: 0,
  activeRentals: 45,
  todayPickups: 0,
  todayReturns: 0,
  overdueItems: 3,
  productUtilization: 78,
  totalRevenue: 544043.16,
  totalRentals: 1847,
  completedRentals: 1756,
  customerGrowth: 234,
  futureRevenue: 180000,
  revenueGrowth: 18,
  customerBase: 234
};

const mockRentalStatusData: RentalStatusData[] = [
  { status: 'Book', count: 5, color: 'bg-blue-500' },
  { status: 'Pickup', count: 8, color: 'bg-green-500' },
  { status: 'Return', count: 12, color: 'bg-gray-500' },
  { status: 'Cancel', count: 2, color: 'bg-red-500' }
];

const mockProductUtilizationData: ProductUtilizationData[] = [
  { category: 'Electronics', rented: 45, available: 15, maintenance: 3 },
  { category: 'Photography', rented: 28, available: 8, maintenance: 2 },
  { category: 'Tools', rented: 32, available: 12, maintenance: 1 },
  { category: 'Party Equipment', rented: 18, available: 6, maintenance: 0 }
];

const mockTodayRevenueData: RevenueData[] = [
  { period: '00:00', actual: 0, projected: 0 },
  { period: '04:00', actual: 250, projected: 500 },
  { period: '08:00', actual: 450, projected: 800 },
  { period: '12:00', actual: 650, projected: 1200 },
  { period: '16:00', actual: 850, projected: 1800 },
  { period: '20:00', actual: 1543, projected: 2500 }
];

const mockMonthRevenueData: RevenueData[] = [
  { period: 'Week 1', actual: 12000, projected: 8000 },
  { period: 'Week 2', actual: 15000, projected: 10000 },
  { period: 'Week 3', actual: 18000, projected: 12000 },
  { period: 'Week 4', actual: 22000, projected: 15000 }
];

const mockYearRevenueData: RevenueData[] = [
  { period: 'Jan', actual: 45000, projected: 12000 },
  { period: 'Feb', actual: 52000, projected: 15000 },
  { period: 'Mar', actual: 48000, projected: 18000 },
  { period: 'Apr', actual: 61000, projected: 22000 },
  { period: 'May', actual: 55000, projected: 19000 },
  { period: 'Jun', actual: 68000, projected: 25000 },
  { period: 'Jul', actual: 72000, projected: 28000 },
  { period: 'Aug', actual: 65000, projected: 24000 },
  { period: 'Sep', actual: 58000, projected: 21000 },
  { period: 'Oct', actual: 62000, projected: 23000 },
  { period: 'Nov', actual: 70000, projected: 26000 },
  { period: 'Dec', actual: 75000, projected: 30000 }
];

const mockTopProducts: TopProduct[] = [
  { id: '1', name: 'iPhone 15 Pro', category: 'Electronics', rentalCount: 45, revenue: 12500, availability: 3, image: '📱' },
  { id: '2', name: 'MacBook Air M2', category: 'Electronics', rentalCount: 32, revenue: 8900, availability: 1, image: '💻' },
  { id: '3', name: 'Canon EOS R6', category: 'Photography', rentalCount: 28, revenue: 6700, availability: 2, image: '📷' },
  { id: '4', name: 'DJI Mini 3 Pro', category: 'Drones', rentalCount: 22, revenue: 5400, availability: 0, image: '🚁' },
  { id: '5', name: 'GoPro Hero 11', category: 'Action Cameras', rentalCount: 18, revenue: 4200, availability: 4, image: '🎥' }
];

const mockTopCustomers: TopCustomer[] = [
  { id: '1', name: 'John Smith', location: 'New York', rentalCount: 15, totalSpent: 2500, lastRental: '2 hours ago', avatar: '👨‍💼' },
  { id: '2', name: 'Sarah Johnson', location: 'Los Angeles', rentalCount: 12, totalSpent: 2100, lastRental: '1 day ago', avatar: '👩‍💻' },
  { id: '3', name: 'Mike Wilson', location: 'Chicago', rentalCount: 10, totalSpent: 1800, lastRental: '3 days ago', avatar: '👨‍🎨' },
  { id: '4', name: 'Emily Davis', location: 'Miami', rentalCount: 8, totalSpent: 1500, lastRental: '1 week ago', avatar: '👩‍🎤' },
  { id: '5', name: 'David Brown', location: 'Seattle', rentalCount: 7, totalSpent: 1200, lastRental: '2 weeks ago', avatar: '👨‍🔬' }
];

const mockRecentRentals: RecentRental[] = [
  { id: '1', orderNumber: 'RENT-001', customerName: 'John Smith', amount: 299.99, status: 'pickup', rentalType: 'RENT', createdAt: '2 hours ago', productCount: 2, pickupDate: 'Today 9:00 AM', returnDate: 'Tomorrow 5:00 PM' },
  { id: '2', orderNumber: 'RENT-002', customerName: 'Sarah Johnson', amount: 199.99, status: 'return', rentalType: 'RENT', createdAt: '4 hours ago', productCount: 1, pickupDate: 'Yesterday 2:00 PM', returnDate: 'Today 2:00 PM' },
  { id: '3', orderNumber: 'RENT-003', customerName: 'Mike Wilson', amount: 399.99, status: 'book', rentalType: 'RENT', createdAt: '6 hours ago', productCount: 3, pickupDate: 'Tomorrow 10:00 AM', returnDate: 'Friday 6:00 PM' },
  { id: '4', orderNumber: 'RENT-004', customerName: 'Emily Davis', amount: 149.99, status: 'pickup', rentalType: 'RENT', createdAt: '1 day ago', productCount: 1, pickupDate: 'Yesterday 3:00 PM', returnDate: 'Today 3:00 PM' },
  { id: '5', orderNumber: 'RENT-005', customerName: 'David Brown', amount: 249.99, status: 'return', rentalType: 'RENT', createdAt: '1 day ago', productCount: 2, pickupDate: '2 days ago 11:00 AM', returnDate: 'Yesterday 11:00 AM' },
  { id: '6', orderNumber: 'RENT-006', customerName: 'Lisa Chen', amount: 89.99, status: 'cancel', rentalType: 'RENT', createdAt: '2 days ago', productCount: 1, pickupDate: 'Yesterday 3:00 PM', returnDate: 'Today 3:00 PM' }
];

const mockOperationalAlerts: OperationalAlert[] = [
  { id: '1', type: 'overdue', title: 'Overdue Returns', message: '3 items are overdue for return', severity: 'high', time: '1 hour ago' },
  { id: '2', type: 'low_stock', title: 'Low Stock Alert', message: '5 products below minimum stock', severity: 'medium', time: '2 hours ago' },
  { id: '3', type: 'maintenance', title: 'Maintenance Due', message: '2 items need service', severity: 'medium', time: '3 hours ago' },
  { id: '4', type: 'payment', title: 'Payment Pending', message: '3 orders pending payment', severity: 'low', time: '4 hours ago' },
  { id: '5', type: 'schedule', title: 'Pickup Schedule', message: '8 pickups scheduled for today', severity: 'low', time: '5 hours ago' }
];

// ============================================================================
// COMPONENTS
// ============================================================================
const StatCard = ({ title, value, change, description, tooltip, color, trend, activeTooltip, setActiveTooltip }: {
  title: string;
  value: string | number;
  change: string;
  description: string;
  tooltip: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  activeTooltip: string | null;
  setActiveTooltip: (title: string | null) => void;
}) => {
  const shouldShowDollar = title.toLowerCase().includes('revenue') || title.toLowerCase().includes('income');
  const isTooltipActive = activeTooltip === title;
  
  const handleTooltipClick = () => {
    if (isTooltipActive) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(title);
    }
  };
  
  return (
    <CardClean variant="default" size="md" className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeaderClean>
        <div className="flex items-center justify-between">
          <CardTitleClean size="md">{title}</CardTitleClean>
          <div className="relative">
            <Info 
              className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" 
              onClick={handleTooltipClick}
            />
            {isTooltipActive && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10 max-w-xs">
                {tooltip}
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            )}
          </div>
        </div>
      </CardHeaderClean>
      <CardContentClean>
        <p className={`text-3xl font-bold ${color} mb-2`}>
          {typeof value === 'number' 
            ? shouldShowDollar 
              ? `$${value.toLocaleString()}`
              : value.toLocaleString()
            : value}
        </p>
        <div className="flex items-center gap-2 mb-1">
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            {change}
          </div>
        </div>
        <p className="text-text-tertiary text-xs">{description}</p>
      </CardContentClean>
    </CardClean>
  );
};

const RentalStatusChart = ({ data }: { data: RentalStatusData[] }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'book': return <Package className="w-5 h-5" />;
      case 'pickup': return <Truck className="w-5 h-5" />;
      case 'return': return <PackageCheck className="w-5 h-5" />;
      case 'cancel': return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'book': return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' };
      case 'pickup': return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
      case 'return': return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' };
      case 'cancel': return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with total */}
      <div className="text-center pb-4 border-b border-gray-200">
        <div className="text-3xl font-bold text-gray-800 mb-1">{total}</div>
        <div className="text-sm text-gray-600">Total Orders</div>
      </div>

      {/* Status items */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          const colors = getStatusColor(item.status);
          
          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.light} group-hover:scale-110 transition-transform duration-200`}>
                    <div className={`${colors.text}`}>
                      {getStatusIcon(item.status)}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 capitalize">{item.status}</div>
                    <div className="text-xs text-gray-500">{item.count} orders</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">{item.count}</div>
                  <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${colors.bg}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {data.find(item => item.status.toLowerCase() === 'book')?.count || 0}
          </div>
          <div className="text-xs text-blue-600">New</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {data.find(item => item.status.toLowerCase() === 'pickup')?.count || 0}
          </div>
          <div className="text-xs text-green-600">Active</div>
        </div>
      </div>
    </div>
  );
};

const ProductUtilizationChart = ({ data }: { data: ProductUtilizationData[] }) => (
  <div className="space-y-4">
    {data.map((item, index) => {
      const total = item.rented + item.available + item.maintenance;
      const rentedPercent = (item.rented / total) * 100;
      const availablePercent = (item.available / total) * 100;
      const maintenancePercent = (item.maintenance / total) * 100;
      
      return (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{item.category}</span>
            <span className="text-gray-600">{total} total</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="bg-green-500" style={{ width: `${rentedPercent}%` }}></div>
              <div className="bg-blue-500" style={{ width: `${availablePercent}%` }}></div>
              <div className="bg-yellow-500" style={{ width: `${maintenancePercent}%` }}></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Rented: {item.rented}</span>
            <span>Available: {item.available}</span>
            <span>Maintenance: {item.maintenance}</span>
          </div>
        </div>
      );
    })}
  </div>
);

const ScheduleItem = ({ type, time, customer, items, status }: {
  type: 'pickup' | 'return';
  time: string;
  customer: string;
  items: number;
  status: 'confirmed' | 'pending' | 'overdue';
}) => {
  const colors = {
    pickup: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    return: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' }
  };
  
  const statusColors = {
    confirmed: 'text-green-600',
    pending: 'text-yellow-600',
    overdue: 'text-red-600'
  };
  
  const color = colors[type];
  
  return (
    <div className={`p-3 rounded-lg border ${color.bg} ${color.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {type === 'pickup' ? (
            <Package className="w-5 h-5 text-blue-600" />
          ) : (
            <PackageCheck className="w-5 h-5 text-green-600" />
          )}
          <div>
            <div className="font-medium text-sm">{type === 'pickup' ? 'Pickup' : 'Return'} {time}</div>
            <div className="text-xs text-gray-600">{customer} - {items} items</div>
          </div>
        </div>
        <div className={`text-xs font-medium ${statusColors[status]}`}>
          {status.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

const AlertItem = ({ alert }: { alert: OperationalAlert }) => {
  const colors = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' }
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'low_stock':
        return <Package className="w-5 h-5 text-yellow-600" />;
      case 'maintenance':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'schedule':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };
  
  const color = colors[alert.severity];
  
  return (
    <div className={`p-3 rounded-lg border ${color.bg} ${color.border}`}>
      <div className="flex items-center space-x-3">
        {getIcon(alert.type)}
        <div className="flex-1">
          <div className="font-medium text-sm">{alert.title}</div>
          <div className="text-xs text-gray-600">{alert.message}</div>
          <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
        </div>
      </div>
    </div>
  );
};

const RentalCard = ({ rental }: { rental: RecentRental }) => {
  const statusColors = {
    book: 'bg-blue-100 text-blue-800',
    pickup: 'bg-green-100 text-green-800',
    return: 'bg-gray-100 text-gray-800',
    cancel: 'bg-red-100 text-red-800'
  };
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <Package className="w-5 h-5 text-blue-600" />
      <div className="flex-1">
        <h4 className="font-medium text-gray-800">{rental.orderNumber}</h4>
        <p className="text-sm text-gray-600">{rental.customerName}</p>
        {rental.pickupDate && (
          <p className="text-xs text-gray-500">Pickup: {rental.pickupDate}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-800">${rental.amount}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[rental.status as keyof typeof statusColors]}`}>
          {rental.status}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>('today');
  const [loading, setLoading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // Date selection for month/year views
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  });
  
  // Date range selection
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  const getStats = () => {
    switch (timePeriod) {
      case 'today':
        return mockTodayStats;
      case 'month':
        return mockMonthStats;
      case 'year':
        return mockYearStats;
      default:
        return mockTodayStats;
    }
  };

  const getRevenueData = () => {
    switch (timePeriod) {
      case 'today':
        return mockTodayRevenueData;
      case 'month':
        return mockMonthRevenueData;
      case 'year':
        return mockYearRevenueData;
      default:
        return mockTodayRevenueData;
    }
  };

  const stats = getStats();
  const revenueData = getRevenueData();

  return (
    <DashboardWrapperClean user={user} onLogout={logout} currentPath="/dashboard">
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-gray-800">
                  Welcome back, {user?.name || 'Owner'}! 👋
                </h1>
                <p className="text-gray-600">
                  {timePeriod === 'today' 
                    ? "Here's what's happening with your rental business today"
                    : timePeriod === 'month'
                    ? `Monthly overview of your rental business performance for ${selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : `Annual performance and strategic insights for ${selectedYear.getFullYear()}`
                  }
                </p>
              </div>
              
              {/* Time Period Filter */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[
                    { id: 'today', label: 'Today', description: 'Operations' },
                    { id: 'month', label: 'Month', description: 'Statistics' },
                    { id: 'year', label: 'Year', description: 'Analytics' }
                  ].map(period => (
                    <button
                      key={period.id}
                      onClick={() => setTimePeriod(period.id as any)}
                      className={`px-3 py-1.5 rounded-md font-medium transition-all text-sm ${
                        timePeriod === period.id
                          ? 'bg-gray-800 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={period.description}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
                
                {/* Date Selection Button with Popup */}
                {(timePeriod === 'month' || timePeriod === 'year') && (
                  <div className="relative ml-3 pl-3 border-l border-gray-300">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {timePeriod === 'month' 
                          ? selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : selectedYear.getFullYear()
                        }
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    {/* Date Selection Popup */}
                    {showDatePicker && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="p-3 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">Select Period</h3>
                          
                          {/* Quick Options */}
                          <div className="space-y-1 mb-3">
                            <button
                              onClick={() => {
                                if (timePeriod === 'month') {
                                  const now = new Date();
                                  setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                                } else {
                                  const now = new Date();
                                  setSelectedYear(new Date(now.getFullYear(), 0, 1));
                                }
                                setShowDatePicker(false);
                              }}
                              className="w-full text-left px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Current {timePeriod === 'month' ? 'Month' : 'Year'}
                            </button>
                            <button
                              onClick={() => {
                                if (timePeriod === 'month') {
                                  const now = new Date();
                                  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                  setSelectedMonth(prevMonth);
                                } else {
                                  const now = new Date();
                                  const prevYear = new Date(now.getFullYear() - 1, 0, 1);
                                  setSelectedYear(prevYear);
                                }
                                setShowDatePicker(false);
                              }}
                              className="w-full text-left px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded"
                            >
                              Previous {timePeriod === 'month' ? 'Month' : 'Year'}
                            </button>
                          </div>
                          
                          {/* Navigation */}
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => {
                                if (timePeriod === 'month') {
                                  const prevMonth = new Date(selectedMonth);
                                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                                  setSelectedMonth(prevMonth);
                                } else {
                                  const prevYear = new Date(selectedYear);
                                  prevYear.setFullYear(prevYear.getFullYear() - 1);
                                  setSelectedYear(prevYear);
                                }
                              }}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="text-sm font-medium text-gray-800">
                              {timePeriod === 'month' 
                                ? selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                : selectedYear.getFullYear()
                              }
                            </span>
                            <button
                              onClick={() => {
                                if (timePeriod === 'month') {
                                  const nextMonth = new Date(selectedMonth);
                                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                                  setSelectedMonth(nextMonth);
                                } else {
                                  const nextYear = new Date(selectedYear);
                                  nextYear.setFullYear(nextYear.getFullYear() + 1);
                                  setSelectedYear(nextYear);
                                }
                              }}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                          
                          {/* Custom Date Range */}
                          <div className="border-t border-gray-200 pt-3">
                            <h4 className="text-xs font-medium text-gray-600 mb-2">CUSTOM RANGE</h4>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">From</label>
                                <input
                                  type="date"
                                  value={dateRange.from.toISOString().split('T')[0]}
                                  onChange={(e) => setDateRange(prev => ({
                                    ...prev,
                                    from: new Date(e.target.value)
                                  }))}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">To</label>
                                <input
                                  type="date"
                                  value={dateRange.to.toISOString().split('T')[0]}
                                  onChange={(e) => setDateRange(prev => ({
                                    ...prev,
                                    to: new Date(e.target.value)
                                  }))}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-1 p-3 border-t border-gray-200">
                          <button
                            onClick={() => setShowDatePicker(false)}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              // Apply custom date range logic here
                              setShowDatePicker(false);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                

              </div>
            </div>
          </div>
        </div>

        {/* Today View - Operational Focus */}
        {timePeriod === 'today' && (
          <>
            {/* Today's Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Today's Revenue"
                value={stats.todayRevenue}
                change="+15% from yesterday"
                description="Cash in hand"
                tooltip="Total revenue collected from completed rentals and payments today"
                color="text-green-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="New Rentals"
                value={stats.todayRentals}
                change="+2 from yesterday"
                description="Orders created today"
                tooltip="Number of new rental orders created today"
                color="text-blue-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Active Rentals"
                value={stats.activeRentals}
                change="+3 from yesterday"
                description="Currently rented"
                tooltip="Total number of items currently being rented out"
                color="text-purple-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Overdue Items"
                value={stats.overdueItems}
                change="+0 from yesterday"
                description="Need attention"
                tooltip="Number of items that are overdue for return"
                color="text-red-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
            </div>

            {/* Today's Operations - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* New Orders */}
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">New Orders</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-3">
                    {mockRecentRentals.filter(rental => rental.status === 'book').slice(0, 6).map(rental => (
                      <div key={rental.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{rental.orderNumber}</div>
                          <div className="text-xs text-gray-600">{rental.customerName} - {rental.productCount} items</div>
                          <div className="text-xs text-gray-500">{rental.createdAt}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">${rental.amount}</div>
                          <div className="text-xs text-gray-500">Book</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContentClean>
              </CardClean>

              {/* Rental Status */}
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Rental Status</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <RentalStatusChart data={mockRentalStatusData} />
                </CardContentClean>
              </CardClean>
            </div>

            {/* Today's Order Activities - Table Format */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Today's Order Activities</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Order</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockRecentRentals.slice(0, 8).map(rental => {
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'book': return 'bg-blue-100 text-blue-800';
                              case 'pickup': return 'bg-green-100 text-green-800';
                              case 'return': return 'bg-gray-100 text-gray-800';
                              case 'cancel': return 'bg-red-100 text-red-800';
                              default: return 'bg-gray-100 text-gray-800';
                            }
                          };
                          
                          const getStatusIcon = (status: string) => {
                            switch (status) {
                              case 'book': return <Package className="w-4 h-4 text-blue-600" />;
                              case 'pickup': return <Package className="w-4 h-4 text-green-600" />;
                              case 'return': return <PackageCheck className="w-4 h-4 text-gray-600" />;
                              case 'cancel': return <AlertTriangle className="w-4 h-4 text-red-600" />;
                              default: return <Package className="w-4 h-4 text-gray-600" />;
                            }
                          };

                          return (
                            <tr key={rental.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(rental.status)}
                                  <span className="font-medium text-gray-800">{rental.orderNumber}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-700">{rental.customerName}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rental.status)}`}>
                                  {rental.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-700">{rental.productCount} items</td>
                              <td className="py-3 px-4 font-semibold text-gray-800">${rental.amount}</td>
                              <td className="py-3 px-4 text-sm text-gray-500">{rental.createdAt}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContentClean>
              </CardClean>
            </div>
          </>
        )}

        {/* Month/Year View - Strategic Focus */}
        {(timePeriod === 'month' || timePeriod === 'year') && (
          <>
            {/* Business Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Revenue"
                value={stats.totalRevenue}
                change={timePeriod === 'month' ? '+8% from last month' : '+12% from last year'}
                description={timePeriod === 'month' ? 'This month' : 'This year'}
                tooltip="Total revenue from all completed rentals and payments"
                color="text-green-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Total Rentals"
                value={stats.totalRentals}
                change={timePeriod === 'month' ? '+12% from last month' : '+5% from last year'}
                description="All rentals"
                tooltip="Total number of rental orders created"
                color="text-blue-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Completed Rentals"
                value={stats.completedRentals}
                change={timePeriod === 'month' ? '+10% from last month' : '+8% from last year'}
                description="Successfully completed"
                tooltip="Number of rentals that have been successfully completed"
                color="text-purple-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Future Revenue"
                value={stats.futureRevenue}
                change={timePeriod === 'month' ? '+5% from last month' : '+8% from last year'}
                description="Booked revenue"
                tooltip="Expected revenue from upcoming and ongoing rentals"
                color="text-orange-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
            </div>

            {/* Revenue Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">
                    {timePeriod === 'month' 
                      ? `${selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Revenue`
                      : `${selectedYear.getFullYear()} Revenue`
                    }
                  </CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <IncomeChart data={revenueData} loading={loading} />
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">
                    {timePeriod === 'month' 
                      ? `${selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Rentals`
                      : `${selectedYear.getFullYear()} Rentals`
                    }
                  </CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <OrderChart data={revenueData} loading={loading} />
                </CardContentClean>
              </CardClean>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Top Products</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-2">
                    {mockTopProducts.map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{product.name}</h4>
                          <p className="text-sm text-gray-600">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">${product.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{product.rentalCount} rentals</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Top Customers</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-2">
                    {mockTopCustomers.map(customer => (
                      <div key={customer.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <Users className="w-5 h-5 text-purple-600" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{customer.name}</h4>
                          <p className="text-sm text-gray-600">{customer.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">{customer.rentalCount} rentals</p>
                          <p className="text-xs text-gray-500">{customer.lastRental}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContentClean>
              </CardClean>
            </div>
          </>
        )}
      </div>
    </DashboardWrapperClean>
  );
} 