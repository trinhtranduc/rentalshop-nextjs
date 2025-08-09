'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  IncomeChart,
  OrderChart,
  TopProducts,
  TopCustomers,
  RecentOrders,
  DashboardWrapper
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface IncomeData {
  month: string;
  year: number;
  realIncome: number;
  futureIncome: number;
}

interface OrderData {
  month: string;
  year: number;
  orderCount: number;
}

interface TopProduct {
  id: string;
  name: string;
  rentPrice: number;
  category: string;
  rentalCount: number;
  totalRevenue: number;
  image?: string | null;
}

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orderCount: number;
  totalSpent: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  productNames: string;
  productImage?: string | null;
  totalAmount: number;
  status: string;
  orderType: string;
  createdAt: string;
  createdBy: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setLoadingCharts(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all dashboard data in parallel
      const [
        statsResponse,
        incomeResponse,
        ordersResponse,
        topProductsResponse,
        topCustomersResponse,
        recentOrdersResponse
      ] = await Promise.all([
        fetch('/api/analytics/dashboard', { headers }),
        fetch('/api/analytics/income', { headers }),
        fetch('/api/analytics/orders', { headers }),
        fetch('/api/analytics/top-products', { headers }),
        fetch('/api/analytics/top-customers', { headers }),
        fetch('/api/analytics/recent-orders', { headers })
      ]);

      // Process responses
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      if (incomeResponse.ok) {
        const incomeData = await incomeResponse.json();
        if (incomeData.success) {
          setIncomeData(incomeData.data);
        }
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        if (ordersData.success) {
          setOrderData(ordersData.data);
        }
      }

      if (topProductsResponse.ok) {
        const productsData = await topProductsResponse.json();
        if (productsData.success) {
          setTopProducts(productsData.data);
        }
      }

      if (topCustomersResponse.ok) {
        const customersData = await topCustomersResponse.json();
        if (customersData.success) {
          setTopCustomers(customersData.data);
        }
      }

      if (recentOrdersResponse.ok) {
        const ordersData = await recentOrdersResponse.json();
        if (ordersData.success) {
          setRecentOrders(ordersData.data);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setLoadingCharts(false);
    }
  };

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardWrapper user={user} onLogout={logout} currentPath="/dashboard">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard - Welcome back, {user?.name || 'Admin'}! 👋
          </h1>
          <p className="text-gray-600">
            System overview and analytics for all outlets
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Customers"
            value={loading ? '...' : stats.totalCustomers}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="bg-blue-500"
          />
          
          <StatCard
            title="Total Products"
            value={loading ? '...' : stats.totalProducts}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            color="bg-green-500"
          />
          
          <StatCard
            title="Total Orders"
            value={loading ? '...' : stats.totalOrders}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            color="bg-purple-500"
          />
          
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
            color="bg-yellow-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <IncomeChart data={incomeData as any} loading={loadingCharts} />
          <OrderChart data={orderData as any} loading={loadingCharts} />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <TopProducts data={topProducts} loading={loadingCharts} />
          <TopCustomers data={topCustomers} loading={loadingCharts} />
          <RecentOrders data={recentOrders} loading={loadingCharts} />
        </div>

        {/* Admin Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <a
                href="/users"
                className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span>Manage Users</span>
              </a>
              
              <a
                href="/shops"
                className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Manage Shops</span>
              </a>
              
              <a
                href="/analytics"
                className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Advanced Analytics</span>
              </a>
              
              <a
                href="/settings"
                className="flex items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>System Settings</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardWrapper>
  );
} 