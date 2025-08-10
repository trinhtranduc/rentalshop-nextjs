'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, SearchableSelect } from '@rentalshop/ui';
import { DashboardWrapper } from '@rentalshop/ui';
import { useRouter } from 'next/navigation';
import { OrderTable } from '@rentalshop/ui';
import { OrderForm } from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';
import type { OrderSearchResult, OrderInput, OrderType, OrderStatus } from '@rentalshop/database';
import { authenticatedFetch } from '@rentalshop/auth/browser';

export default function OrdersPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    console.log('🔄 Orders useEffect - currentPage changed to:', currentPage);
    fetchOrders();
  }, [currentPage]);

  // Separate effect for filters
  useEffect(() => {
    setCurrentPage(1);
    fetchOrders();
    fetchStats();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      console.log('🔍 fetchOrders called with currentPage:', currentPage);
      
      const params = new URLSearchParams({
        offset: ((currentPage - 1) * 10).toString(),
        limit: '10',
        ...(filters.q && { q: filters.q }),
        ...(filters.orderType && { orderType: filters.orderType }),
        ...(filters.status && { status: filters.status }),
        ...(filters.outletId && { outletId: filters.outletId }),
      });

      console.log('🔍 API URL params:', params.toString());
      const response = await authenticatedFetch(`/api/orders?${params.toString()}`);

      console.log('🔍 API Response status:', response.status);

      if (response.status === 304) {
        console.log('🔍 304 Not modified - keeping existing orders');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API Response data:', data);
        console.log('🔍 Orders count:', data.data.orders?.length);
        console.log('🔍 Total pages:', data.data.totalPages);
        
        setOrders(data.data.orders);
        setTotalPages(data.data.totalPages || 1);
      } else {
        console.error('🔍 API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/orders/stats');

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
      const response = await authenticatedFetch('/api/orders', {
        method: 'POST',
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
      const response = await authenticatedFetch(`/api/orders?orderId=${orderId}`, {
        method: 'PUT',
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
      const response = await authenticatedFetch(`/api/orders?orderId=${orderId}`, {
        method: 'PUT',
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
      const response = await authenticatedFetch(`/api/orders?orderId=${orderId}`, {
        method: 'DELETE',
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
      <DashboardWrapper user={user} onLogout={logout} currentPath="/orders">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper user={user} onLogout={logout} currentPath="/orders">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Quản lý đơn hàng</h1>
              <p className="text-sm text-gray-600">Quản lý đơn hàng và giao dịch thuê/bán</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  // TODO: Implement export functionality
                  alert('Export functionality coming soon!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Trích xuất
              </Button>
              <Button 
                onClick={() => router.push('/orders/create')}
                className="bg-green-600 hover:bg-green-700 text-white h-9 px-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tạo đơn hàng
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Tổng đơn hàng</p>
                    <p className="text-xl font-semibold text-gray-900">{stats.totalOrders}</p>
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
                    <p className="text-xs font-medium text-gray-600">Doanh thu</p>
                    <p className="text-xl font-semibold text-green-600">
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
                    <p className="text-xs font-medium text-gray-600">Đang thuê</p>
                    <p className="text-xl font-semibold text-blue-600">{stats.activeRentals}</p>
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
                    <p className="text-xs font-medium text-gray-600">Quá hạn</p>
                    <p className="text-xl font-semibold text-red-600">{stats.overdueRentals}</p>
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



        {/* Advanced Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Search - grows */}
              <div className="flex-1 min-w-[240px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
                <Input
                  placeholder="Tìm theo số đơn hàng, tên khách hàng..."
                  value={filters.q}
                  onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                />
              </div>

              {/* Right side filters */}
              <div className="flex gap-3 md:justify-end">
                <div className="w-56">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại đơn hàng</label>
                  <SearchableSelect
                    value={filters.orderType || ''}
                    onChange={(val) => setFilters(prev => ({ ...prev, orderType: (val as OrderType | '') || '' }))}
                    options={[
                      { value: '', label: 'Tất cả' },
                      { value: 'RENT', label: 'Đơn thuê' },
                      { value: 'SALE', label: 'Đơn bán' },
                    ]}
                    placeholder="Tất cả"
                    displayMode="button"
                  />
                </div>
                <div className="w-56">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                  <SearchableSelect
                    value={filters.status || ''}
                    onChange={(val) => setFilters(prev => ({ ...prev, status: (val as OrderStatus) || '' }))}
                    options={[
                      { value: '', label: 'Tất cả' },
                      { value: 'PENDING', label: 'Chờ xác nhận' },
                      { value: 'CONFIRMED', label: 'Đã xác nhận' },
                      { value: 'ACTIVE', label: 'Đang thuê' },
                      { value: 'COMPLETED', label: 'Hoàn thành' },
                      { value: 'CANCELLED', label: 'Đã hủy' },
                      { value: 'OVERDUE', label: 'Quá hạn' },
                    ]}
                    placeholder="Tất cả"
                    displayMode="button"
                  />
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
            </div>
          </CardContent>
        </Card>

        {/* Orders Table List */}
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
          <>
            <Card className="mb-6">
              <OrderTable
                orders={orders}
                onView={handleViewOrder}
                onPickup={handlePickup}
                onReturn={handleReturn}
                onCancel={handleCancel}
              />
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('⬅️ Previous button clicked, current page:', currentPage);
                    setCurrentPage(prev => Math.max(1, prev - 1));
                  }}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('➡️ Next button clicked, current page:', currentPage);
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Create Order moved to /orders/create */}
      </div>
    </DashboardWrapper>
  );
} 