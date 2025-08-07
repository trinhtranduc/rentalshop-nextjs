'use client';

import React, { useState, useEffect } from 'react';
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
import { getStoredUser } from '../../lib/auth';

// ============================================================================
// TYPES
// ============================================================================
interface DashboardStats {
  realIncome: number;
  futureIncome: number;
  totalOrders: number;
  activeRentals: number;
  todayPickups: number;
  todayReturns: number;
  overdueCount: number;
  customerGrowth: number;
  productUtilization: number;
}

interface IncomeData {
  month: string;
  year: number;
  realIncome: number;
  futureIncome: number;
}

interface OrderData {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  totalRevenue: number;
  rentalCount: number;
  availability: number;
  image?: string;
}

interface TopCustomer {
  id: string;
  name: string;
  location: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: string;
  avatar?: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  orderType: string;
  createdAt: string;
  productCount: number;
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  time: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================
const mockStats: DashboardStats = {
  realIncome: 544043.158,
  futureIncome: 3204.25,
  totalOrders: 968,
  activeRentals: 45,
  todayPickups: 8,
  todayReturns: 5,
  overdueCount: 3,
  customerGrowth: 23,
  productUtilization: 78
};

const mockIncomeData: IncomeData[] = [
  { month: 'Jan', year: 2024, realIncome: 45000, futureIncome: 12000 },
  { month: 'Feb', year: 2024, realIncome: 52000, futureIncome: 15000 },
  { month: 'Mar', year: 2024, realIncome: 48000, futureIncome: 18000 },
  { month: 'Apr', year: 2024, realIncome: 61000, futureIncome: 22000 },
  { month: 'May', year: 2024, realIncome: 55000, futureIncome: 19000 },
  { month: 'Jun', year: 2024, realIncome: 68000, futureIncome: 25000 },
  { month: 'Jul', year: 2024, realIncome: 72000, futureIncome: 28000 },
  { month: 'Aug', year: 2024, realIncome: 65000, futureIncome: 24000 },
  { month: 'Sep', year: 2024, realIncome: 58000, futureIncome: 21000 },
  { month: 'Oct', year: 2024, realIncome: 62000, futureIncome: 23000 },
  { month: 'Nov', year: 2024, realIncome: 70000, futureIncome: 26000 },
  { month: 'Dec', year: 2024, realIncome: 75000, futureIncome: 30000 }
];

const mockOrderData: OrderData[] = [
  { date: 'Jan', orders: 45, revenue: 45000 },
  { date: 'Feb', orders: 52, revenue: 52000 },
  { date: 'Mar', orders: 48, revenue: 48000 },
  { date: 'Apr', orders: 61, revenue: 61000 },
  { date: 'May', orders: 55, revenue: 55000 },
  { date: 'Jun', orders: 68, revenue: 68000 },
  { date: 'Jul', orders: 72, revenue: 72000 },
  { date: 'Aug', orders: 65, revenue: 65000 },
  { date: 'Sep', orders: 58, revenue: 58000 },
  { date: 'Oct', orders: 62, revenue: 62000 },
  { date: 'Nov', orders: 70, revenue: 70000 },
  { date: 'Dec', orders: 75, revenue: 75000 }
];

const mockTopProducts: TopProduct[] = [
  { id: '1', name: 'iPhone 15 Pro', category: 'Electronics', totalRevenue: 12500, rentalCount: 45, availability: 3, image: '📱' },
  { id: '2', name: 'MacBook Air M2', category: 'Electronics', totalRevenue: 8900, rentalCount: 32, availability: 1, image: '💻' },
  { id: '3', name: 'Canon EOS R6', category: 'Photography', totalRevenue: 6700, rentalCount: 28, availability: 2, image: '📷' },
  { id: '4', name: 'DJI Mini 3 Pro', category: 'Drones', totalRevenue: 5400, rentalCount: 22, availability: 0, image: '🚁' },
  { id: '5', name: 'GoPro Hero 11', category: 'Action Cameras', totalRevenue: 4200, rentalCount: 18, availability: 4, image: '🎥' }
];

const mockTopCustomers: TopCustomer[] = [
  { id: '1', name: 'John Smith', location: 'New York', orderCount: 15, totalSpent: 2500, lastOrder: '2 hours ago', avatar: '👨‍💼' },
  { id: '2', name: 'Sarah Johnson', location: 'Los Angeles', orderCount: 12, totalSpent: 2100, lastOrder: '1 day ago', avatar: '👩‍💻' },
  { id: '3', name: 'Mike Wilson', location: 'Chicago', orderCount: 10, totalSpent: 1800, lastOrder: '3 days ago', avatar: '👨‍🎨' },
  { id: '4', name: 'Emily Davis', location: 'Miami', orderCount: 8, totalSpent: 1500, lastOrder: '1 week ago', avatar: '👩‍🎤' },
  { id: '5', name: 'David Brown', location: 'Seattle', orderCount: 7, totalSpent: 1200, lastOrder: '2 weeks ago', avatar: '👨‍🔬' }
];

const mockRecentOrders: RecentOrder[] = [
  { id: '1', orderNumber: 'ORD-001', customerName: 'John Smith', totalAmount: 299.99, status: 'active', orderType: 'RENT', createdAt: '2 hours ago', productCount: 2 },
  { id: '2', orderNumber: 'ORD-002', customerName: 'Sarah Johnson', totalAmount: 199.99, status: 'completed', orderType: 'SALE', createdAt: '4 hours ago', productCount: 1 },
  { id: '3', orderNumber: 'ORD-003', customerName: 'Mike Wilson', totalAmount: 399.99, status: 'pending', orderType: 'RENT', createdAt: '6 hours ago', productCount: 3 },
  { id: '4', orderNumber: 'ORD-004', customerName: 'Emily Davis', totalAmount: 149.99, status: 'active', orderType: 'RENT', createdAt: '1 day ago', productCount: 1 },
  { id: '5', orderNumber: 'ORD-005', customerName: 'David Brown', totalAmount: 249.99, status: 'completed', orderType: 'SALE', createdAt: '1 day ago', productCount: 2 }
];

const mockNotifications: Notification[] = [
  { id: '1', type: 'success', title: 'New Order', message: 'Order ORD-006 created successfully', time: '5 min ago' },
  { id: '2', type: 'warning', title: 'Overdue Return', message: '3 items are overdue for return', time: '1 hour ago' },
  { id: '3', type: 'info', title: 'System Update', message: 'New features available in dashboard', time: '2 hours ago' },
  { id: '4', type: 'error', title: 'Payment Failed', message: 'Payment for ORD-003 failed', time: '3 hours ago' }
];

// ============================================================================
// COMPONENTS
// ============================================================================
const StatCard = ({ title, value, change, description, icon, color, trend }: {
  title: string;
  value: string | number;
  change: string;
  description: string;
  icon: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}) => (
  <CardClean variant="default" size="md" className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
    <CardHeaderClean>
      <div className="flex items-center justify-between">
        <CardTitleClean size="md">{title}</CardTitleClean>
      </div>
    </CardHeaderClean>
    <CardContentClean>
      <p className={`text-3xl font-bold ${color} mb-2`}>
        {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-sm font-medium ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {change}
        </span>
      </div>
      <p className="text-text-tertiary text-xs">{description}</p>
    </CardContentClean>
  </CardClean>
);

const QuickActionCard = ({ title, description, icon, color, action }: {
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}) => (
  <div 
    className={`p-4 rounded-lg border-2 border-dashed border-${color}-200 hover:border-${color}-400 hover:bg-${color}-50 transition-all duration-300 cursor-pointer group`}
    onClick={action}
  >
    <div className="flex items-center gap-3">
      <div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </div>
);

const NotificationCard = ({ notification }: { notification: Notification }) => {
  const colors = {
    success: 'green',
    warning: 'yellow',
    info: 'blue',
    error: 'red'
  };
  
  const color = colors[notification.type];
  
  return (
    <div className={`p-3 rounded-lg border-l-4 border-${color}-500 bg-${color}-50 hover:bg-${color}-100 transition-colors cursor-pointer`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-800">{notification.title}</h4>
          <p className="text-sm text-gray-600">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product }: { product: TopProduct }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex-1">
      <h4 className="font-medium text-gray-800">{product.name}</h4>
      <p className="text-sm text-gray-600">{product.category}</p>
    </div>
    <div className="text-right">
      <p className="font-semibold text-green-600">${product.totalRevenue.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{product.rentalCount} rentals</p>
    </div>
  </div>
);

const CustomerCard = ({ customer }: { customer: TopCustomer }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex-1">
      <h4 className="font-medium text-gray-800">{customer.name}</h4>
      <p className="text-sm text-gray-600">{customer.location}</p>
    </div>
    <div className="text-right">
      <p className="font-semibold text-blue-600">{customer.orderCount} orders</p>
      <p className="text-xs text-gray-500">{customer.lastOrder}</p>
    </div>
  </div>
);

const OrderCard = ({ order }: { order: RecentOrder }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h4 className="font-medium text-gray-800">{order.orderNumber}</h4>
        <p className="text-sm text-gray-600">{order.customerName}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-800">${order.totalAmount}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status as keyof typeof statusColors]}`}>
          {order.status}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [incomeData, setIncomeData] = useState<IncomeData[]>(mockIncomeData);
  const [orderData, setOrderData] = useState<OrderData[]>(mockOrderData);
  const [topProducts, setTopProducts] = useState<TopProduct[]>(mockTopProducts);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>(mockTopCustomers);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(mockRecentOrders);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [loading, setLoading] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions'>('overview');
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>('today');

  useEffect(() => {
    const currentUser = getStoredUser();
    setUser(currentUser);
  }, []);

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    // Add your action logic here
  };

  const getFilteredStats = () => {
    const baseStats = { ...mockStats };
    
    switch (timePeriod) {
      case 'today':
        return {
          ...baseStats,
          realIncome: 1543.25,
          futureIncome: 1250.50,
          totalOrders: 12,
          activeRentals: 8,
          todayPickups: 3,
          todayReturns: 2,
          overdueCount: 1,
          customerGrowth: 5,
          productUtilization: 85
        };
      case 'month':
        return {
          ...baseStats,
          realIncome: 45678.90,
          futureIncome: 8900.25,
          totalOrders: 156,
          activeRentals: 23,
          todayPickups: 8,
          todayReturns: 5,
          overdueCount: 3,
          customerGrowth: 23,
          productUtilization: 78
        };
      case 'year':
        return {
          ...baseStats,
          realIncome: 544043.158,
          futureIncome: 3204.25,
          totalOrders: 968,
          activeRentals: 45,
          todayPickups: 8,
          todayReturns: 5,
          overdueCount: 3,
          customerGrowth: 23,
          productUtilization: 78
        };
      default:
        return baseStats;
    }
  };

  const getFilteredIncomeData = () => {
    switch (timePeriod) {
      case 'today':
        return [
          { month: '00:00', year: 2024, realIncome: 0, futureIncome: 0 },
          { month: '04:00', year: 2024, realIncome: 250, futureIncome: 100 },
          { month: '08:00', year: 2024, realIncome: 450, futureIncome: 200 },
          { month: '12:00', year: 2024, realIncome: 650, futureIncome: 300 },
          { month: '16:00', year: 2024, realIncome: 850, futureIncome: 400 },
          { month: '20:00', year: 2024, realIncome: 1543, futureIncome: 1250 }
        ];
      case 'month':
        return [
          { month: 'Week 1', year: 2024, realIncome: 12000, futureIncome: 3000 },
          { month: 'Week 2', year: 2024, realIncome: 15000, futureIncome: 3500 },
          { month: 'Week 3', year: 2024, realIncome: 18000, futureIncome: 4000 },
          { month: 'Week 4', year: 2024, realIncome: 22000, futureIncome: 4500 }
        ];
      case 'year':
        return mockIncomeData;
      default:
        return mockIncomeData;
    }
  };

  const getFilteredOrderData = () => {
    switch (timePeriod) {
      case 'today':
        return [
          { date: '00:00', orders: 0, revenue: 0 },
          { date: '04:00', orders: 2, revenue: 250 },
          { date: '08:00', orders: 4, revenue: 450 },
          { date: '12:00', orders: 6, revenue: 650 },
          { date: '16:00', orders: 8, revenue: 850 },
          { date: '20:00', orders: 12, revenue: 1543 }
        ];
      case 'month':
        return [
          { date: 'Week 1', orders: 35, revenue: 12000 },
          { date: 'Week 2', orders: 42, revenue: 15000 },
          { date: 'Week 3', orders: 38, revenue: 18000 },
          { date: 'Week 4', orders: 41, revenue: 22000 }
        ];
      case 'year':
        return mockOrderData;
      default:
        return mockOrderData;
    }
  };

  const currentStats = getFilteredStats();
  const currentIncomeData = getFilteredIncomeData();
  const currentOrderData = getFilteredOrderData();

  return (
    <DashboardWrapperClean>
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-gray-800">Welcome back, {user?.name || 'Owner'}! 👋</h1>
                <p className="text-gray-600">Here's what's happening with your rental business today</p>
              </div>
              
              {/* Time Period Filter - Right Side */}
              <div className="flex items-center gap-3">
                <span className="text-gray-600 font-medium">Time Period:</span>
                <div className="flex gap-2">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'Year' }
                  ].map(period => (
                    <button
                      key={period.id}
                      onClick={() => setTimePeriod(period.id as any)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                        timePeriod === period.id
                          ? 'bg-gray-800 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

                {/* Dashboard Content */}
        {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Real Income"
                value={currentStats.realIncome}
                change={timePeriod === 'today' ? '+15% from yesterday' : timePeriod === 'month' ? '+8% from last month' : '+12% from last year'}
                description="Completed payments"
                icon="💰"
                color="text-gray-700"
                trend="up"
              />
              <StatCard
                title="Future Income"
                value={currentStats.futureIncome}
                change={timePeriod === 'today' ? '+10% from yesterday' : timePeriod === 'month' ? '+5% from last month' : '+8% from last year'}
                description="Pending orders"
                icon="🎯"
                color="text-gray-700"
                trend="up"
              />
              <StatCard
                title="Total Orders"
                value={currentStats.totalOrders}
                change={timePeriod === 'today' ? '+3 from yesterday' : timePeriod === 'month' ? '+12% from last month' : '+5% from last year'}
                description="All time orders"
                icon="📦"
                color="text-gray-700"
                trend="up"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CardClean size="md">
                <CardContentClean>
                  <IncomeChart data={currentIncomeData} loading={loadingCharts} />
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardContentClean>
                  <OrderChart data={currentOrderData} loading={loadingCharts} />
                </CardContentClean>
              </CardClean>
            </div>

            {/* Today's Activities */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Today's Schedule</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-700">📤</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Pickups</p>
                          <p className="text-sm text-gray-600">{currentStats.todayPickups} scheduled</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-gray-700">{currentStats.todayPickups}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-700">📥</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Returns</p>
                          <p className="text-sm text-gray-600">{currentStats.todayReturns} scheduled</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-gray-700">{currentStats.todayReturns}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-700">⚠️</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Overdue</p>
                          <p className="text-sm text-gray-600">Needs attention</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-gray-700">{currentStats.overdueCount}</span>
                      </div>
                    </div>
                  </div>
                </CardContentClean>
              </CardClean>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Top Products</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-2">
                    {topProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
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
                    {topCustomers.map(customer => (
                      <CustomerCard key={customer.id} customer={customer} />
                    ))}
                  </div>
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Recent Orders</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-2">
                    {recentOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </CardContentClean>
              </CardClean>
            </div>
        </div>
      </DashboardWrapperClean>
    );
  } 