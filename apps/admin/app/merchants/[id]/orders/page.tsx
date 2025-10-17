'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  Orders,
  Button,
  Breadcrumb,
  type BreadcrumbItem,
  useToast } from '@rentalshop/ui';
import { ShoppingCart, Plus } from 'lucide-react';
import type { Order, OrderFilters } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT ORDERS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 */
export default function MerchantOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastInfo } = useToast();
  const merchantId = params.id as string;
  
  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const orderType = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch merchant info
      const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
      
      if (merchantData.success && merchantData.data) {
        setMerchantName(merchantData.data.name);
      }

      // Fetch orders
      const ordersRes = await merchantsApi.orders.list(parseInt(merchantId), '');
      const ordersData = await ordersRes.json();
      console.log('📦 Orders API response:', ordersData);

      if (ordersData.success) {
        // API returns data as direct array OR data.orders
        const ordersArray = Array.isArray(ordersData.data) 
          ? ordersData.data 
          : ordersData.data?.orders || [];
        console.log('📦 Orders array, count:', ordersArray.length);
        
        const transformedOrders = ordersArray.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          totalAmount: order.totalAmount,
          depositAmount: order.depositAmount,
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customerName: order.customer?.name || 'Unknown Customer',
          customerPhone: order.customer?.phone || '',
          outletName: order.outlet?.name || 'Unknown Outlet',
          merchantName: merchantName || `Merchant ${merchantId}`,
          customer: order.customer,
          outlet: order.outlet
        }));
        
        setOrders(transformedOrders);
      } else {
        setError(ordersData.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CLIENT-SIDE FILTERING & PAGINATION
  // ============================================================================
  
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (search) {
      filtered = filtered.filter(o => 
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status && status !== 'all') {
      filtered = filtered.filter(o => o.status === status);
    }
    
    if (orderType && orderType !== 'all') {
      filtered = filtered.filter(o => o.orderType === orderType);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      const order = sortOrder === 'desc' ? -1 : 1;
      return (aVal > bVal ? 1 : -1) * order;
    });
    
    return filtered;
  }, [orders, search, status, orderType, sortBy, sortOrder]);

  const orderData = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / limit);
    
    return {
      orders: paginatedOrders,
      total,
      currentPage: page,
      totalPages,
      limit,
      hasMore: endIndex < total
    };
  }, [filteredOrders, page, limit]);

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: OrderFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    if ('status' in newFilters) updates.status = newFilters.status;
    if ('orderType' in newFilters) updates.type = newFilters.orderType;
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleOrderAction = useCallback((action: string, orderId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/orders/${orderId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/orders/${orderId}/edit`);
        break;
      default:
        console.log('Order action:', action, orderId);
    }
  }, [router, merchantId]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> }
  ], [merchantId, merchantName]);

  if (error) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const filters = { search, status, orderType, sortBy, sortOrder };

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/merchants/${merchantId}/orders/create`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        <Orders
          data={orderData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onOrderAction={handleOrderAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
          showStats={false}
        />
      </div>
    </PageWrapper>
  );
}
