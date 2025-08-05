'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@rentalshop/ui';
import DashboardWrapper from '../../components/DashboardWrapper';
import { OrderCard } from '@rentalshop/ui';
import { OrderForm } from '@rentalshop/ui';
import { getStoredUser } from '../../lib/auth/auth';
import type { OrderSearchResult, OrderInput, OrderType, OrderStatus } from '@rentalshop/database';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSearchResult | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    q: '',
    orderType: '' as OrderType | '',
    status: '' as OrderStatus | '',
    outletId: '',
  });

  const user = getStoredUser();

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.orderType) params.append('orderType', filters.orderType);
      if (filters.status) params.append('status', filters.status);
      if (filters.outletId) params.append('outletId', filters.outletId);

      const response = await fetch(`http://localhost:3002/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:3002/api/orders/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateOrder = async (orderData: OrderInput) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:3002/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateForm(false);
        fetchOrders();
        fetchStats();
        alert('Đơn hàng đã được tạo thành công!');
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng');
    }
  };

  const handlePickup = async (orderId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:3002/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ACTIVE',
          pickedUpAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchOrders();
        fetchStats();
        alert('Đã xác nhận nhận hàng!');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    }
  };

  const handleReturn = async (orderId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:3002/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          returnedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchOrders();
        fetchStats();
        alert('Đã xác nhận trả hàng!');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:3002/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Hủy bởi nhân viên',
        }),
      });

      if (response.ok) {
        fetchOrders();
        fetchStats();
        alert('Đã hủy đơn hàng!');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Có lỗi xảy ra khi hủy đơn hàng');
    }
  };

  const handleViewOrder = (orderId: string) => {
    // Navigate to order detail page
    window.open(`/orders/${orderId}`, '_blank');
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý đơn hàng</h1>
              <p className="text-gray-600">Quản lý đơn hàng và giao dịch thuê/bán</p>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              Tạo đơn hàng mới
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Doanh thu</p>
                    <p className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Đang thuê</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeRentals}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quá hạn</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdueRentals}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <Input
                  placeholder="Tìm theo số đơn hàng, tên khách hàng..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại đơn hàng
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.orderType}
                  onChange={(e) => setFilters(prev => ({ ...prev, orderType: e.target.value as OrderType }))}
                >
                  <option value="">Tất cả</option>
                  <option value="RENT">Thuê</option>
                  <option value="SALE">Bán</option>
                  <option value="RENT_TO_OWN">Thuê để mua</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                >
                  <option value="">Tất cả</option>
                  <option value="PENDING">Chờ xác nhận</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="ACTIVE">Đang thuê</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                  <option value="OVERDUE">Quá hạn</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ q: '', orderType: '', status: '', outletId: '' })}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Chưa có đơn hàng nào</h3>
                  <p>Bắt đầu tạo đơn hàng đầu tiên của bạn.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onView={handleViewOrder}
                onPickup={handlePickup}
                onReturn={handleReturn}
                onCancel={handleCancel}
              />
            ))
          )}
        </div>

        {/* Create Order Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Tạo đơn hàng mới</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Đóng
                </Button>
              </div>
              <OrderForm
                onSubmit={handleCreateOrder}
                onCancel={() => setShowCreateForm(false)}
                customers={[]} // TODO: Fetch customers
                products={[]} // TODO: Fetch products
                outlets={[]} // TODO: Fetch outlets
              />
            </div>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
} 