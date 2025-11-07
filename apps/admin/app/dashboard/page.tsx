'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import { CardClean, 
  CardHeaderClean, 
  CardTitleClean, 
  CardContentClean,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent, 
  useToast,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  IncomeChart,
  OrderChart,
  Badge,
  StatusBadge
} from '@rentalshop/ui';
import { 
  AdminPageHeader,
  MetricCard,
  ActivityFeed
} from '@rentalshop/ui';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { analyticsApi } from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Building2, 
  Activity,
  Store,
  Clock,
  CheckCircle,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface SystemMetrics {
  totalMerchants: number;
  totalTenants: number; // Alias for totalMerchants (multi-tenant)
  totalOutlets: number;
  totalUsers: number;
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  activeMerchants: number;
  activeTenants: number; // Alias for activeMerchants (multi-tenant)
  newMerchantsThisMonth: number;
  newTenantsThisMonth: number; // Alias for newMerchantsThisMonth (multi-tenant)
  newMerchantsThisYear: number;
  newTenantsThisYear: number; // Alias for newMerchantsThisYear (multi-tenant)
}

interface MerchantTrend {
  month: string;
  newMerchants: number;
  activeMerchants: number;
}

interface SubscriptionRevenueData {
  period: string;
  actual: number;
}

interface SubscriptionRevenueChartProps {
  data: SubscriptionRevenueData[];
  loading?: boolean;
}

interface MerchantsRegistrationData {
  period: string;
  actual: number;
}

interface MerchantsRegistrationChartProps {
  data: MerchantsRegistrationData[];
  loading?: boolean;
}

const SubscriptionRevenueChart: React.FC<SubscriptionRevenueChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.map(item => ({
    period: item.period,
    'Subscription Revenue': item.actual,
  }));

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => [
    `$${value.toLocaleString()}`,
    name
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: '#374151' }}
        />
        <Bar 
          dataKey="Subscription Revenue" 
          fill="#10B981" 
          radius={[4, 4, 0, 0]}
          name="Subscription Revenue"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const MerchantsRegistrationChart: React.FC<MerchantsRegistrationChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.map(item => ({
    period: item.period,
    'Merchants Registered': item.actual,
  }));

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => [
    `${value} merchants`,
    name
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: '#374151' }}
        />
        <Bar 
          dataKey="Merchants Registered" 
          fill="#3B82F6" 
          radius={[4, 4, 0, 0]}
          name="Merchants Registered"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default function AdminDashboard() {
  const { toastError } = useToast();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalMerchants: 0,
    totalTenants: 0,
    totalOutlets: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeMerchants: 0,
    activeTenants: 0,
    newMerchantsThisMonth: 0,
    newTenantsThisMonth: 0,
    newMerchantsThisYear: 0,
    newTenantsThisYear: 0
  });
  const [merchantTrends, setMerchantTrends] = useState<MerchantTrend[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptionRevenueData, setSubscriptionRevenueData] = useState<any[]>([]);
  const [merchantsRegistrationData, setMerchantsRegistrationData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [newMerchants, setNewMerchants] = useState<any[]>([]);
  const [subscriptionStats, setSubscriptionStats] = useState({
    active: 0,
    trial: 0,
    expiring: 0,
    cancelled: 0,
    totalRevenue: 0
  });
  const [growthMetrics, setGrowthMetrics] = useState({
    customerGrowth: 0,
    revenueGrowth: 0,
    customerBase: 0
  });
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPathname = usePathname();
  
  // Get timePeriod from URL or default to 'month'
  const timePeriodFromUrl = searchParams.get('period') as 'today' | 'month' | 'year' | null;
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>(
    (timePeriodFromUrl && ['today', 'month', 'year'].includes(timePeriodFromUrl)) ? timePeriodFromUrl : 'month'
  );

  // Update URL when timePeriod changes
  const updateTimePeriod = (period: 'today' | 'month' | 'year') => {
    setTimePeriod(period);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.push(`${currentPathname}?${params.toString()}`, { scroll: false });
  };

  // Calculate subscription revenue data for chart based on subscription creation/success date
  const calculateSubscriptionRevenueData = (subscriptions: any[], timePeriod: string, startDate: Date, endDate: Date) => {
    // Filter subscriptions that were created/successful in the time period
    const subscriptionsInPeriod = subscriptions.filter((s: any) => {
      const createdAt = new Date(s.createdAt);
      const status = String(s.status).toLowerCase();
      return createdAt >= startDate && createdAt <= endDate && ['active', 'trial'].includes(status);
    });
    
    if (timePeriod === 'today') {
      // For today, show hourly breakdown of subscriptions created today
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        // Calculate revenue for subscriptions created in this hour
        const hourlyRevenue = subscriptionsInPeriod.reduce((sum, sub) => {
          const createdAt = new Date(sub.createdAt);
          
          // Check if subscription was created in this hour
          if (createdAt >= hourStart && createdAt < hourEnd) {
            return sum + (sub.amount || 0);
          }
          return sum;
        }, 0);
        
        hourlyData.push({
          period: hourStart.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
          actual: hourlyRevenue
        });
      }
      return hourlyData;
      
    } else if (timePeriod === 'month') {
      // For month, show daily breakdown of subscriptions created in this month
      const dailyData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Calculate revenue for subscriptions created on this day
        const dailyRevenue = subscriptionsInPeriod.reduce((sum, sub) => {
          const createdAt = new Date(sub.createdAt);
          
          // Check if subscription was created on this day
          if (createdAt >= dayStart && createdAt <= dayEnd) {
            return sum + (sub.amount || 0);
          }
          return sum;
        }, 0);
        
        dailyData.push({
          period: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          actual: dailyRevenue
        });
        
        current.setDate(current.getDate() + 1);
      }
      return dailyData;
      
    } else if (timePeriod === 'year') {
      // For year, show monthly breakdown of subscriptions created in this year
      const monthlyData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Calculate revenue for subscriptions created during this month
        const monthlyRevenue = subscriptionsInPeriod.reduce((sum, sub) => {
          const createdAt = new Date(sub.createdAt);
          
          // Check if subscription was created during this month
          if (createdAt >= monthStart && createdAt <= monthEnd) {
            return sum + (sub.amount || 0);
          }
          return sum;
        }, 0);
        
        monthlyData.push({
          period: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          actual: monthlyRevenue
        });
        
        current.setMonth(current.getMonth() + 1);
      }
      return monthlyData;
    }
    
    return [];
  };

  // Calculate merchants registration data for chart based on merchant creation date
  const calculateMerchantsRegistrationData = (merchants: any[], timePeriod: string, startDate: Date, endDate: Date) => {
    // Filter merchants that were created in the time period
    const merchantsInPeriod = merchants.filter((m: any) => {
      const createdAt = new Date(m.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });
    
    if (timePeriod === 'today') {
      // For today, show hourly breakdown of merchants created today
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        // Count merchants created in this hour
        const hourlyCount = merchantsInPeriod.filter((m: any) => {
          const createdAt = new Date(m.createdAt);
          return createdAt >= hourStart && createdAt < hourEnd;
        }).length;
        
        hourlyData.push({
          period: hourStart.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
          actual: hourlyCount
        });
      }
      return hourlyData;
      
    } else if (timePeriod === 'month') {
      // For month, show daily breakdown of merchants created in this month
      const dailyData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Count merchants created on this day
        const dailyCount = merchantsInPeriod.filter((m: any) => {
          const createdAt = new Date(m.createdAt);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }).length;
        
        dailyData.push({
          period: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          actual: dailyCount
        });
        
        current.setDate(current.getDate() + 1);
      }
      return dailyData;
      
    } else if (timePeriod === 'year') {
      // For year, show monthly breakdown of merchants created in this year
      const monthlyData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Count merchants created during this month
        const monthlyCount = merchantsInPeriod.filter((m: any) => {
          const createdAt = new Date(m.createdAt);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }).length;
        
        monthlyData.push({
          period: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          actual: monthlyCount
        });
        
        current.setMonth(current.getMonth() + 1);
      }
      return monthlyData;
    }
    
    return [];
  };

  // Sync URL param with state on mount and when URL changes
  useEffect(() => {
    const periodFromUrl = searchParams.get('period') as 'today' | 'month' | 'year' | null;
    if (periodFromUrl && ['today', 'month', 'year'].includes(periodFromUrl) && periodFromUrl !== timePeriod) {
      setTimePeriod(periodFromUrl);
    }
  }, [searchParams, timePeriod]);

  useEffect(() => {
    fetchSystemMetrics();
  }, [timePeriod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [timePeriod]);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // Create date range based on selected time period
      const today = new Date();
      let startDate: Date;
      let endDate: Date;
      let groupBy: 'day' | 'month' | 'year';

      switch (timePeriod) {
        case 'today':
          // For today, we want to include the entire current day
          // Use UTC to avoid timezone issues
          const todayUTC = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
          startDate = new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate());
          endDate = new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate() + 1);
          groupBy = 'day';
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          groupBy = 'month';
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          groupBy = 'day';
      }
      
      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        groupBy: groupBy,
        period: timePeriod // Add period to filters for API
      };

      console.log(`📊 Fetching admin dashboard data for ${timePeriod} period:`, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy
      });
      
      // Fetch all analytics in parallel
      const [
        systemResponse,
        activitiesResponse,
        revenueResponse,
        ordersResponse,
        merchantsResponse,
        subscriptionsResponse,
        growthMetricsResponse
      ] = await Promise.all([
        analyticsApi.getSystemAnalytics(filters),
        analyticsApi.getRecentActivities(10, 0),
        analyticsApi.getIncomeAnalytics(filters),
        analyticsApi.getOrderAnalytics(filters),
        import('@rentalshop/utils').then(({ merchantsApi }) => merchantsApi.getMerchants()),
        import('@rentalshop/utils').then(({ subscriptionsApi }) => subscriptionsApi.search({ limit: 1000 })),
        analyticsApi.getGrowthMetrics(filters)
      ]);

      console.log('📊 API Responses:', {
        system: systemResponse.success,
        activities: activitiesResponse.success,
        revenue: revenueResponse.success,
        orders: ordersResponse.success,
        merchants: merchantsResponse.success,
        subscriptions: subscriptionsResponse.success,
        growthMetrics: growthMetricsResponse.success
      });

      // System metrics
      if (systemResponse.success && systemResponse.data) {
        setMetrics(systemResponse.data);
        setMerchantTrends(systemResponse.data.merchantTrends || []);
        console.log('✅ System metrics loaded');
      } else {
        console.error('❌ Failed to fetch system metrics:', systemResponse.message);
      }

      // Recent activities
      if (activitiesResponse.success && activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data || []);
        console.log('✅ Activities loaded:', activitiesResponse.data.length);
      }

      // Revenue data - Transform for chart compatibility
      if (revenueResponse.success && revenueResponse.data) {
        const transformedRevenue = revenueResponse.data.map((item: any) => ({
          period: item.month || item.period,
          actual: item.realIncome || 0,
          projected: item.futureIncome || 0
        }));
        setRevenueData(transformedRevenue);
        console.log('✅ Revenue data loaded & transformed:', transformedRevenue.length);
      }

      // New Merchants data - Calculate from merchants array
      if (merchantsResponse.success && merchantsResponse.data) {
        const merchantsArray = merchantsResponse.data.merchants || [];
        
        // Filter merchants within the selected time period
        const filteredMerchants = merchantsArray.filter((merchant: any) => {
          if (!merchant.createdAt) return false;
          const createdDate = new Date(merchant.createdAt);
          return createdDate >= startDate && createdDate <= endDate;
        });
        
        // Group merchants by creation date period
        const merchantsByPeriod = new Map<string, { period: string; count: number; sortKey: string }>();
        
        filteredMerchants.forEach((merchant: any) => {
          const date = new Date(merchant.createdAt);
          let period: string;
          let sortKey: string;
          
          if (groupBy === 'day') {
            // For day grouping: "Jan 15"
            period = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            sortKey = date.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
          } else {
            // For month grouping: "Jan"
            period = date.toLocaleDateString('en-US', { month: 'short' });
            sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM for sorting
          }
          
          const existing = merchantsByPeriod.get(sortKey);
          if (existing) {
            existing.count += 1;
          } else {
            merchantsByPeriod.set(sortKey, { period, count: 1, sortKey });
          }
        });
        
        // Transform to chart format and sort chronologically
        const transformedMerchants = Array.from(merchantsByPeriod.values())
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
          .map(({ period, count }) => ({
            period,
            actual: count,
            projected: 0
          }));
        
        setOrdersData(transformedMerchants);
        console.log('✅ New merchants data calculated:', {
          total: filteredMerchants.length,
          periods: transformedMerchants.length,
          data: transformedMerchants
        });
      }

      // Growth metrics
      if (growthMetricsResponse.success && growthMetricsResponse.data) {
        setGrowthMetrics(growthMetricsResponse.data);
        console.log('✅ Growth metrics loaded:', growthMetricsResponse.data);
      }

      // New merchants (sort by creation date)
      if (merchantsResponse.success && merchantsResponse.data) {
        const merchantsArray = merchantsResponse.data.merchants || [];
        const newMerchantsData = merchantsArray
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            createdAt: m.createdAt,
            subscriptionStatus: m.subscriptionStatus,
            plan: m.plan?.name || 'N/A'
          }));
        setNewMerchants(newMerchantsData);
        console.log('✅ New merchants calculated:', newMerchantsData.length);

        // Calculate merchants registration data for chart based on time period
        const merchantsRegistrationChartData = calculateMerchantsRegistrationData(merchantsArray, timePeriod, startDate, endDate);
        setMerchantsRegistrationData(merchantsRegistrationChartData);
        console.log('✅ Merchants registration chart data calculated:', merchantsRegistrationChartData);
      }

      // Subscription stats (calculate from subscriptions data)
      if (subscriptionsResponse.success && subscriptionsResponse.data) {
        const subsData = subscriptionsResponse.data as any;
        const subscriptions = Array.isArray(subsData) ? subsData : subsData.data || [];
        
        const stats = {
          active: subscriptions.filter((s: any) => String(s.status).toLowerCase() === 'active').length,
          trial: subscriptions.filter((s: any) => String(s.status).toLowerCase() === 'trial').length,
          expiring: subscriptions.filter((s: any) => {
            if (!s.currentPeriodEnd) return false;
            const daysUntilExpiry = Math.ceil((new Date(s.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
          }).length,
          cancelled: subscriptions.filter((s: any) => String(s.status).toLowerCase() === 'cancelled').length,
          totalRevenue: subscriptions
            .filter((s: any) => {
              const createdAt = new Date(s.createdAt);
              const status = String(s.status).toLowerCase();
              return createdAt >= startDate && createdAt <= endDate && ['active', 'trial'].includes(status);
            })
            .reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
        };
        setSubscriptionStats(stats);
        console.log('✅ Subscription stats calculated:', stats);

        // Calculate subscription revenue data for chart based on time period
        const subscriptionRevenueChartData = calculateSubscriptionRevenueData(subscriptions, timePeriod, startDate, endDate);
        setSubscriptionRevenueData(subscriptionRevenueChartData);
        console.log('✅ Subscription revenue chart data calculated:', subscriptionRevenueChartData);

      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system metrics';
      
      // Check if it's a subscription error (don't redirect to login)
      if (error instanceof Error && (
        error.message.includes('subscription') ||
        error.message.includes('paused') ||
        error.message.includes('expired') ||
        error.message.includes('trial')
      )) {
        console.log('⚠️ Subscription error detected, showing error instead of redirecting');
        toastError('Subscription Issue', errorMessage);
        return;
      }
      
      // Handle other 401 errors
      if (error instanceof Error) {
        const { analyzeError, clearAuthData } = await import('@rentalshop/utils');
        const errorInfo = analyzeError(error);
        
        if (errorInfo.type === 'auth') {
          clearAuthData();
          toastError('Session Expired', 'Please log in again');
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return;
        }
      }
      
      toastError('Error', errorMessage);
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Enhanced metrics with icons and trends
  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'today': return 'today';
      case 'month': return 'this month';
      case 'year': return 'this year';
      default: return 'this month';
    }
  };

  const enhancedMetrics = [
    {
      title: 'Platform Merchants',
      value: metrics.totalMerchants,
      change: { 
        value: metrics.newMerchantsThisMonth, 
        isPositive: true, 
        period: getPeriodLabel() 
      },
      icon: Building2,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100'
    },
    // Platform Revenue - Hidden for OUTLET_STAFF
    ...(user?.role !== 'OUTLET_STAFF' ? [{
      title: 'Platform Revenue',
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      change: growthMetrics.revenueGrowth ? { 
        value: Math.abs(Math.round(growthMetrics.revenueGrowth)), 
        isPositive: growthMetrics.revenueGrowth >= 0, 
        period: getPeriodLabel() 
      } : undefined,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }] : []),
    {
      title: 'System Users',
      value: metrics.totalUsers,
      change: growthMetrics.customerGrowth ? { 
        value: Math.abs(Math.round(growthMetrics.customerGrowth)), 
        isPositive: growthMetrics.customerGrowth >= 0, 
        period: getPeriodLabel() 
      } : undefined,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Platform Orders',
      value: metrics.totalOrders.toLocaleString(),
      change: undefined,  // No order growth data yet
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];


  return (
    <PageWrapper>
      <PageContent>
        {/* Time Period Selector */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              variant={timePeriod === 'today' ? 'default' : 'outline'}
              onClick={() => updateTimePeriod('today')}
              className="px-4 py-2 text-sm"
            >
              Today
            </Button>
            <Button
              variant={timePeriod === 'month' ? 'default' : 'outline'}
              onClick={() => updateTimePeriod('month')}
              className="px-4 py-2 text-sm"
            >
              This Month
            </Button>
            <Button
              variant={timePeriod === 'year' ? 'default' : 'outline'}
              onClick={() => updateTimePeriod('year')}
              className="px-4 py-2 text-sm"
            >
              This Year
            </Button>
          </div>
          <Button
            variant="default"
            onClick={fetchSystemMetrics}
            className="px-4 py-2 text-sm"
          >
            Refresh
          </Button>
        </div>
        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {enhancedMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
              color={metric.color}
              bgColor={metric.bgColor}
            />
          ))}
        </div>

        {/* Subscription Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{subscriptionStats.active}</div>
              <p className="text-xs text-gray-500">Currently active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Trial Subscriptions</CardTitle>
              <Clock className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{subscriptionStats.trial}</div>
              <p className="text-xs text-gray-500">In trial period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Expiring Soon</CardTitle>
              <Bell className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{subscriptionStats.expiring}</div>
              <p className="text-xs text-gray-500">Within 7 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cancelled</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{subscriptionStats.cancelled}</div>
              <p className="text-xs text-gray-500">Churned accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Orders Charts */}
        {user?.role !== 'OUTLET_STAFF' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>
                  Subscription Revenue by Creation Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SubscriptionRevenueChart data={subscriptionRevenueData} loading={loading} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>
                  Total Merchants Registered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MerchantsRegistrationChart data={merchantsRegistrationData} loading={loading} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* New Merchants */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-700" />
                  New Merchants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {newMerchants.length > 0 ? (
                  <div className="space-y-3">
                    {newMerchants.map((merchant, index) => (
                      <div key={merchant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => window.location.href = `/merchants/${merchant.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{merchant.name}</div>
                            <div className="text-xs text-gray-500">{merchant.plan}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {new Date(merchant.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <StatusBadge 
                            status={merchant.subscriptionStatus} 
                            type="subscription" 
                            size="sm" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Store className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No new merchants</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activities */}
          <div>
            <ActivityFeed
              title="Recent System Activities"
              activities={recentActivities}
              maxItems={5}
            />
          </div>
          </div>

      </PageContent>
    </PageWrapper>
  );
} 