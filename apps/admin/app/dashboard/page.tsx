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
import './dashboard.css';
import { SegmentedControl, MetricTile, ChartCard } from './components/DashboardTiles';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { analyticsApi, formatInShopZone } from '@rentalshop/utils';
import { getDashboardWindow, bucketByShopPeriod, groupCountsByShopPeriod, inDashboardWindow, type DashboardWindow } from './dashboard-buckets';
import { DASHBOARD_MERCHANT_HREFS } from './subscription-stats';
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
  ResponsiveContainer,
  Cell
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

/** Today's bar keeps the full series colour, the others are softened (only when today is in the data). */
const highlightFill = (period: string, rows: { period: string }[], token: string) => {
  const today = formatInShopZone(new Date(), 'en', { month: 'short', day: 'numeric' });
  const hasToday = rows.some((r) => r.period === today);
  return `rgb(var(--ar-${token}) / ${!hasToday || period === today ? 1 : 0.45})`;
};

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
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--ar-line))" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12, fill: 'rgb(var(--ar-muted))' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12, fill: 'rgb(var(--ar-muted))' }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: 'rgb(var(--ar-ink-2))' }}
        />
        <Bar 
          dataKey="Subscription Revenue" 
          fill="rgb(var(--ar-chart-blue))" 
          radius={[4, 4, 0, 0]}
          name="Subscription Revenue"
        >
          {chartData.map((row) => (
            <Cell key={row.period} fill={highlightFill(row.period, chartData, 'chart-blue')} />
          ))}
        </Bar>
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
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--ar-line))" />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12, fill: 'rgb(var(--ar-muted))' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: 'rgb(var(--ar-muted))' }}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelStyle={{ color: 'rgb(var(--ar-ink-2))' }}
        />
        <Bar 
          dataKey="Merchants Registered" 
          fill="rgb(var(--ar-chart-violet))" 
          radius={[4, 4, 0, 0]}
          name="Merchants Registered"
        >
          {chartData.map((row) => (
            <Cell key={row.period} fill={highlightFill(row.period, chartData, 'chart-violet')} />
          ))}
        </Bar>
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
    all: 0,
    inUse: 0,
    trial: 0,
    expired: 0,
    expiring: 0,
    cancelled: 0,
    basic: 0,
    pro: 0,
    enterprise: 0,
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
        growthMetricsResponse,
        tileTotals,
      ] = await Promise.all([
        analyticsApi.getSystemAnalytics(filters),
        analyticsApi.getRecentActivities(10, 0),
        analyticsApi.getIncomeAnalytics(filters),
        analyticsApi.getOrderAnalytics(filters),
        import('@rentalshop/utils').then(({ merchantsApi }) => merchantsApi.getMerchants()),
        import('@rentalshop/utils').then(({ subscriptionsApi }) => subscriptionsApi.search({ limit: 1000 })),
        analyticsApi.getGrowthMetrics(filters),
        import('@rentalshop/utils').then(async ({ merchantsApi }) => {
          const totalOf = async (status?: string, plan?: string) => {
            const r = await merchantsApi.searchMerchants({
              status,
              plan,
              limit: 1,
            });
            return r.success ? (r.data?.total ?? 0) : 0;
          };
          const [all, inUse, trial, expiring, expired, cancelled, basic, pro, enterprise] = await Promise.all([
            totalOf(),
            totalOf('current'),
            totalOf('trial'),
            totalOf('expiring'),
            totalOf('expired'),
            totalOf('cancelled'),
            totalOf(undefined, 'Basic'),
            totalOf(undefined, 'Professional'),
            totalOf(undefined, 'Enterprise'),
          ]);
          return { all, inUse, trial, expiring, expired, cancelled, basic, pro, enterprise };
        }),
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

      const subsData = subscriptionsResponse.success ? (subscriptionsResponse.data as any) : null;
      const subscriptions = Array.isArray(subsData) ? subsData : subsData?.data || [];
      if (tileTotals) {
        setSubscriptionStats({
          ...tileTotals,
          totalRevenue: subscriptions
            .filter((s: any) => {
              const status = String(s.status).toLowerCase();
              return inDashboardWindow(s.createdAt, dashWindow) && ['active', 'trial'].includes(status);
            })
            .reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
        });
      }

      const subscriptionRevenueChartData = calculateSubscriptionRevenueData(subscriptions, dashWindow);
      setSubscriptionRevenueData(subscriptionRevenueChartData);
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
    ...(user?.role !== 'OUTLET_STAFF' && user?.role !== 'OUTLET_INVENTORY' ? [{
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
        
        {/* Title + period control */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-ar-ink">Dashboard</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedControl
              ariaLabel="Period"
              value={period as 'today' | 'month' | 'year'}
              onChange={(v) => updateTimePeriod(v)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'month', label: 'This Month' },
                { value: 'year', label: 'This Year' },
              ]}
            />
            <button
              type="button"
              className="ar-dash-refresh"
              onClick={() => {
                fetchSystemMetrics();
                fetchRankings();
              }}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Subscription Health Metrics - Clickable */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          <MetricTile
            testId="dash-tile-merchants"
            title="Merchants"
            value={subscriptionStats.all}
            pill="All shops"
            tone="info"
            onClick={() => router.push(DASHBOARD_MERCHANT_HREFS.all)}
            chips={[
              { label: `Basic: ${subscriptionStats.basic}`, testId: 'dash-chip-basic', onClick: () => router.push(DASHBOARD_MERCHANT_HREFS.basic) },
              { label: `Pro: ${subscriptionStats.pro}`, testId: 'dash-chip-pro', onClick: () => router.push(DASHBOARD_MERCHANT_HREFS.pro) },
              { label: `Enterprise: ${subscriptionStats.enterprise}`, testId: 'dash-chip-enterprise', onClick: () => router.push(DASHBOARD_MERCHANT_HREFS.enterprise) },
            ]}
          />
          <MetricTile testId="dash-tile-in-use" title="In use" value={subscriptionStats.inUse} pill="Still in period" tone="good" onClick={() => router.push(DASHBOARD_MERCHANT_HREFS.inUse)} />
          <MetricTile testId="dash-tile-expired" title="Expired" value={subscriptionStats.expired} pill="Period ended" tone="bad" onClick={() => router.push(DASHBOARD_MERCHANT_HREFS.expired)} />
          <MetricTile testId="dash-tile-trial" title="Trial" value={subscriptionStats.trial} pill="In trial period" tone="info" onClick={() => router.push(DASHBOARD_MERCHANT_HREFS.trial)} />
          <MetricTile testId="dash-tile-expiring" title="Expiring Soon" value={subscriptionStats.expiring} pill="Within 7 days" tone="warn" onClick={() => router.push(DASHBOARD_MERCHANT_HREFS.expiring)} />
          <MetricTile testId="dash-tile-cancelled" title="Cancelled" value={subscriptionStats.cancelled} pill="Churned" tone="neutral" onClick={() => router.push(DASHBOARD_MERCHANT_HREFS.cancelled)} />
        </div>

        {/* Revenue & Orders Charts */}
        {user?.role !== 'OUTLET_STAFF' && user?.role !== 'OUTLET_INVENTORY' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
            <ChartCard title="Subscription Revenue by Creation Date" legend={[{ label: 'Subscription Revenue', color: 'rgb(var(--ar-chart-blue))' }, { label: 'Today', color: 'rgb(var(--ar-chart-blue) / 0.45)' }]}>
              <SubscriptionRevenueChart data={subscriptionRevenueData} loading={loading} />
            </ChartCard>

            <ChartCard title="Total Merchants Registered" legend={[{ label: 'Merchants Registered', color: 'rgb(var(--ar-chart-violet))' }]}>
              <MerchantsRegistrationChart data={merchantsRegistrationData} loading={loading} />
            </ChartCard>
          </div>
        )}

        {/* Top shops by revenue + top products per shop for the selected period */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <Card className="rounded-xl border-ar-line bg-ar-surface shadow-ar">
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
                    className="w-full min-h-[44px] sm:min-h-0"
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

          <Card className="rounded-xl border-ar-line bg-ar-surface shadow-ar">
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
                    className="w-full min-h-[44px] sm:min-h-0"
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
            <Card className="rounded-xl border-ar-line bg-ar-surface shadow-ar">
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