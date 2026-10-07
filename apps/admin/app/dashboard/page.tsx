'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  StatusBadge,
  PageLoadingIndicator
} from '@rentalshop/ui';
import { 
  AdminPageHeader,
  MetricCard,
  ActivityFeed
} from '@rentalshop/ui';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { analyticsApi, formatInShopZone } from '@rentalshop/utils';
import { getDashboardWindow, bucketByShopPeriod, groupCountsByShopPeriod, inDashboardWindow, type DashboardWindow } from './dashboard-buckets';
import { useAuth, useDashboardTranslations, useCommonTranslations } from '@rentalshop/hooks';
import type { TopProduct, TopOutlet } from '@rentalshop/types';
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
  AlertTriangle,
  Package
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
import {
  getAdminDashboardDateRange,
  unwrapRankingPage,
  type RankingSortBy
} from './ranking-period';
import {
  RankingEmptyState,
  RankingSortButtons,
  TopProductRow,
  TopShopRow
} from './components/RankingLists';

interface SystemMetrics {
  totalMerchants: number;
  totalOutlets: number;
  totalUsers: number;
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  activeMerchants: number;
  newMerchantsThisMonth: number;
  newMerchantsThisYear: number;
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
  const tDashboard = useDashboardTranslations();
  const tCommon = useCommonTranslations();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalMerchants: 0,
    totalOutlets: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeMerchants: 0,
    newMerchantsThisMonth: 0,
    newMerchantsThisYear: 0
  });
  const [merchantTrends, setMerchantTrends] = useState<MerchantTrend[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptionRevenueData, setSubscriptionRevenueData] = useState<any[]>([]);
  const [merchantsRegistrationData, setMerchantsRegistrationData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [newMerchants, setNewMerchants] = useState<any[]>([]);
  const [topShops, setTopShops] = useState<TopOutlet[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [productSortBy, setProductSortBy] = useState<RankingSortBy>('revenue');
  const [subscriptionStats, setSubscriptionStats] = useState({
    active: 0,
    trial: 0,
    expired: 0,
    expiring: 0,
    cancelled: 0,
    basic: 0,
    pro: 0,
    totalRevenue: 0
  });
  const [growthMetrics, setGrowthMetrics] = useState({
    customerGrowth: 0,
    revenueGrowth: 0,
    customerBase: 0
  });
  const [loading, setLoading] = useState(false); // Start with false - page renders immediately
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPathname = usePathname();
  
  // Get period from URL - simple and direct
  const period = (searchParams.get('period') || 'month') as 'today' | 'month' | 'year';

  // Update URL when period changes - URL is single source of truth
  const updateTimePeriod = useCallback((newPeriod: 'today' | 'month' | 'year') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    router.push(`${currentPathname}?${params.toString()}`, { scroll: false });
  }, [currentPathname, router, searchParams]);

  // Chart data on Vietnam hours / days / months, whatever the browser zone (#578 ADM-7)
  const calculateSubscriptionRevenueData = (subscriptions: any[], dashWindow: DashboardWindow) =>
    bucketByShopPeriod(
      subscriptions.filter((s: any) => ['active', 'trial'].includes(String(s.status).toLowerCase())),
      dashWindow,
      (s: any) => s.createdAt,
      (s: any) => s.amount || 0
    );

  const calculateMerchantsRegistrationData = (merchants: any[], dashWindow: DashboardWindow) =>
    bucketByShopPeriod(merchants, dashWindow, (m: any) => m.createdAt, () => 1);

  // Simple fetch function - can be called from useEffect or button
  const fetchSystemMetrics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Vietnam days of the period (#355, #578 ADM-7): the API reads the keys as Vietnam days and the
      // merchant/subscription charts below use the same window, whatever the browser zone.
      const dashWindow = getDashboardWindow(period);
      const groupBy: 'day' | 'month' = dashWindow.groupBy;
      const apiRange = { startDate: dashWindow.startKey, endDate: dashWindow.endKey };

      const filters = {
        startDate: apiRange.startDate,
        endDate: apiRange.endDate,
        groupBy: groupBy,
        period: period // Add period to filters for API
      };

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

      // System metrics
      if (systemResponse.success && systemResponse.data) {
        setMetrics(systemResponse.data);
        setMerchantTrends(systemResponse.data.merchantTrends || []);
      }

      // Recent activities
      if (activitiesResponse.success && activitiesResponse.data) {
        // API returns { data: { data: activities[], pagination: {...} } }
        const activitiesData = activitiesResponse.data?.data || activitiesResponse.data;
        setRecentActivities(Array.isArray(activitiesData) ? activitiesData : []);
      }

      // Revenue data - Transform for chart compatibility
      if (revenueResponse.success && revenueResponse.data) {
        const transformedRevenue = revenueResponse.data.map((item: any) => ({
          period: item.month || item.period,
          actual: item.realIncome || 0,
          projected: item.futureIncome || 0
        }));
        setRevenueData(transformedRevenue);
      }

      // New Merchants data - Calculate from merchants array
      if (merchantsResponse.success && merchantsResponse.data) {
        const merchantsArray = merchantsResponse.data.merchants || [];
        
        // New merchants per Vietnam day (month view) or month (year view), sorted and labelled by that same day
        const transformedMerchants = groupCountsByShopPeriod(
          merchantsArray.filter((merchant: any) => !!merchant.createdAt),
          dashWindow,
          (merchant: any) => merchant.createdAt
        );

        setOrdersData(transformedMerchants);
      }

      // Growth metrics
      if (growthMetricsResponse.success && growthMetricsResponse.data) {
        setGrowthMetrics(growthMetricsResponse.data);
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
            phone: m.phone,
            address: m.address,
            city: m.city,
            state: m.state,
            zipCode: m.zipCode,
            country: m.country,
            subscriptionStatus: m.subscription?.status ?? 'trial',
            plan: m.subscription?.plan?.name || 'No Plan'
          }));
        setNewMerchants(newMerchantsData);

        // Calculate merchants registration data for chart based on time period
        const merchantsRegistrationChartData = calculateMerchantsRegistrationData(merchantsArray, dashWindow);
        setMerchantsRegistrationData(merchantsRegistrationChartData);
      }

      // Subscription stats (calculate from subscriptions data)
      if (subscriptionsResponse.success && subscriptionsResponse.data) {
        const subsData = subscriptionsResponse.data as any;
        const subscriptions = Array.isArray(subsData) ? subsData : subsData.data || [];
        
        const stats = {
          active: subscriptions.filter((s: any) => String(s.status).toLowerCase() === 'active').length,
          trial: subscriptions.filter((s: any) => String(s.status).toLowerCase() === 'trial').length,
          expired: subscriptions.filter((s: any) => {
            // Expired = currentPeriodEnd < now
            if (!s.currentPeriodEnd) return false;
            return new Date(s.currentPeriodEnd) < new Date();
          }).length,
          expiring: subscriptions.filter((s: any) => {
            if (!s.currentPeriodEnd) return false;
            const daysUntilExpiry = Math.ceil((new Date(s.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
          }).length,
          cancelled: subscriptions.filter((s: any) => String(s.status).toLowerCase() === 'cancelled').length,
          basic: subscriptions.filter((s: any) => String(s.plan?.name || '').toLowerCase() === 'basic').length,
          pro: subscriptions.filter((s: any) => String(s.plan?.name || '').toLowerCase().includes('pro')).length,
          totalRevenue: subscriptions
            .filter((s: any) => {
              const status = String(s.status).toLowerCase();
              return inDashboardWindow(s.createdAt, dashWindow) && ['active', 'trial'].includes(status);
            })
            .reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
        };
        setSubscriptionStats(stats);

        // Calculate subscription revenue data for chart based on time period
        const subscriptionRevenueChartData = calculateSubscriptionRevenueData(subscriptions, dashWindow);
        setSubscriptionRevenueData(subscriptionRevenueChartData);
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
        toastError('Subscription Issue', errorMessage);
        setLoading(false);
        return;
      }
      
      // Handle other 401 errors
      if (error instanceof Error) {
        const { analyzeError, clearAuthData } = await import('@rentalshop/utils');
        const errorInfo = analyzeError(error);
        
        if (errorInfo.type === 'auth') {
          clearAuthData();
          toastError('Session Expired', 'Please log in again');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          setLoading(false);
          return;
        }
      }
      
      toastError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]); // Only depend on period - toastError is stable

  const fetchRankings = useCallback(async () => {
    try {
      const range = getAdminDashboardDateRange(period);
      const filters = {
        startDate: range.startDate,
        endDate: range.endDate,
        limit: 5,
        page: 1
      };
      const [topShopsResponse, topProductsResponse] = await Promise.all([
        analyticsApi.getTopOutlets(filters),
        analyticsApi.getTopProducts({ ...filters, sortBy: productSortBy })
      ]);

      if (topShopsResponse.success) {
        setTopShops(unwrapRankingPage<TopOutlet>(topShopsResponse.data).items);
      } else {
        setTopShops([]);
      }

      if (topProductsResponse.success) {
        setTopProducts(unwrapRankingPage<TopProduct>(topProductsResponse.data).items);
      } else {
        setTopProducts([]);
      }
    } catch (error) {
      console.error('Error fetching ranking metrics:', error);
      setTopShops([]);
      setTopProducts([]);
    }
  }, [period, productSortBy]);

  // Fetch when period changes
  useEffect(() => {
    fetchSystemMetrics();
  }, [fetchSystemMetrics]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Enhanced metrics with icons and trends
  const getPeriodLabel = () => {
    switch (period) {
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
        {/* Page Loading Indicator - Floating, non-blocking */}
        <PageLoadingIndicator loading={loading} />
        
        {/* Time Period Selector */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={period === 'today' ? 'default' : 'outline'}
              onClick={() => updateTimePeriod('today')}
              className="px-3 sm:px-4 py-2 text-sm"
            >
              Today
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              onClick={() => updateTimePeriod('month')}
              className="px-3 sm:px-4 py-2 text-sm"
            >
              This Month
            </Button>
            <Button
              variant={period === 'year' ? 'default' : 'outline'}
              onClick={() => updateTimePeriod('year')}
              className="px-3 sm:px-4 py-2 text-sm"
            >
              This Year
            </Button>
          </div>
          <Button
            variant="default"
            onClick={() => {
              fetchSystemMetrics();
              fetchRankings();
            }}
            disabled={loading}
            className="px-4 py-2 text-sm"
          >
            Refresh
          </Button>
        </div>


        {/* Subscription Health Metrics - Clickable */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
            onClick={() => router.push('/merchants')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">Merchants</CardTitle>
              <Building2 className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-blue-700">{metrics.totalMerchants}</div>
              <p className="text-[10px] text-gray-500">Total merchants</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-sky-300 transition-all"
            onClick={() => router.push('/subscriptions?status=TRIAL')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">Trial</CardTitle>
              <Clock className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-sky-600">{subscriptionStats.trial}</div>
              <p className="text-[10px] text-gray-500">In trial period</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all"
            onClick={() => router.push('/subscriptions?status=ACTIVE')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-green-600">{subscriptionStats.active}</div>
              <p className="text-[10px] text-gray-500">Basic: {subscriptionStats.basic} | Pro: {subscriptionStats.pro}</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-orange-300 transition-all"
            onClick={() => router.push('/subscriptions')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">Expiring Soon</CardTitle>
              <Bell className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-orange-600">{subscriptionStats.expiring}</div>
              <p className="text-[10px] text-gray-500">Within 7 days</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md hover:border-red-300 transition-all"
            onClick={() => router.push('/subscriptions')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-red-500">{subscriptionStats.expired}</div>
              <p className="text-[10px] text-gray-500">Period ended</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md hover:border-gray-400 transition-all"
            onClick={() => router.push('/subscriptions?status=CANCELLED')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-gray-600">Cancelled</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-bold text-red-600">{subscriptionStats.cancelled}</div>
              <p className="text-[10px] text-gray-500">Churned</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Orders Charts */}
        {user?.role !== 'OUTLET_STAFF' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  Subscription Revenue by Creation Date
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <SubscriptionRevenueChart data={subscriptionRevenueData} loading={loading} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  Total Merchants Registered
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <MerchantsRegistrationChart data={merchantsRegistrationData} loading={loading} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top shops by revenue + top products per shop for the selected period */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-700" />
                {tDashboard('charts.topShops')}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/top-shops?period=${period}`)}
              >
                {tCommon('buttons.viewAll')}
              </Button>
            </CardHeader>
            <CardContent>
              {topShops.length > 0 ? (
                <div className="space-y-3">
                  {topShops.map((shop, index) => (
                    <TopShopRow
                      key={shop.id}
                      shop={shop}
                      rank={index + 1}
                      onClick={() => router.push(`/merchants/${shop.merchantId}/outlets/${shop.id}`)}
                    />
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/dashboard/top-shops?period=${period}`)}
                  >
                    {tCommon('buttons.viewAll')}
                  </Button>
                </div>
              ) : (
                <RankingEmptyState kind="shops" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-700" />
                  {tDashboard('charts.topProducts')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/top-products?period=${period}&sortBy=${productSortBy}`)}
                >
                  {tCommon('buttons.viewAll')}
                </Button>
              </div>
              <RankingSortButtons sortBy={productSortBy} onChange={setProductSortBy} />
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <TopProductRow
                      key={`${product.id}-${product.outletId ?? index}`}
                      product={product}
                      rank={index + 1}
                      sortBy={productSortBy}
                      onProductClick={() => {
                        if (product.merchantId && product.id) {
                          router.push(`/merchants/${product.merchantId}/products/${product.id}`);
                        }
                      }}
                      onShopClick={
                        product.merchantId && product.outletId
                          ? () => router.push(`/merchants/${product.merchantId}/outlets/${product.outletId}`)
                          : undefined
                      }
                    />
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/dashboard/top-products?period=${period}&sortBy=${productSortBy}`)}
                  >
                    {tCommon('buttons.viewAll')}
                  </Button>
                </div>
              ) : (
                <RankingEmptyState kind="products" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
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
                      <div key={merchant.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer gap-2" onClick={() => router.push(`/merchants/${merchant.id}`)}>
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{merchant.name}</div>
                            {merchant.phone && (
                              <div className="text-xs text-gray-500 truncate">{merchant.phone}</div>
                            )}
                            {(() => {
                              const fullAddress = [merchant.address, merchant.city, merchant.state, merchant.zipCode, merchant.country]
                                .filter(Boolean)
                                .join(', ');
                              return fullAddress ? (
                                <div className="text-xs text-gray-500 truncate">{fullAddress}</div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            {formatInShopZone(merchant.createdAt, 'en', { month: 'short', day: 'numeric' })}
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