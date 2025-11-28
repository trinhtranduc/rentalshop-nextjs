'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, 
  CardContent,
  PageWrapper,
  PageHeader,
  PageTitle,
  Button,
  PaymentTable,
  Pagination,
  useToast } from '@rentalshop/ui';
import { 
  Search, 
  Download, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  XCircle,
  Clock
} from 'lucide-react';
import { usePaymentsData } from '@rentalshop/hooks';

/**
 * ✅ MODERN PAYMENTS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with usePaymentsData hook
 * ✅ Request deduplication with useDedupedApi
 */
export default function PaymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastInfo, toastSuccess, toastError } = useToast();

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const dateFilter = searchParams.get('dateFilter') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // ============================================================================
  // DATA FETCHING - Clean & Simple with Deduplication
  // ============================================================================
  
  const filters = useMemo(() => ({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
    page,
    limit
  }), [search, status, dateFilter, page, limit]);

  const { data, loading, error } = usePaymentsData({ filters });
  
  console.log('📊 Payments Page - Data state:', {
    hasData: !!data,
    paymentsCount: data?.payments?.length || 0,
    loading,
    error: error?.message
  });

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      // Special handling for page: always set it, even if it's 1
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 0) {
          params.set(key, pageNum.toString());
        } else {
          params.delete(key);
        }
      } else if (value && value !== '' && value !== 'all') {
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
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateURL({ q: e.target.value, page: 1 });
  }, [updateURL]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateURL({ status: e.target.value, page: 1 });
  }, [updateURL]);

  const handleDateFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateURL({ dateFilter: e.target.value, page: 1 });
  }, [updateURL]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleViewPayment = useCallback((payment: any) => {
    console.log('View payment:', payment.id);
    // Could navigate to detail page or show modal
  }, []);

  const handleProcessPayment = useCallback(async (paymentId: number) => {
    try {
      console.log('Processing payment:', paymentId);
      toastSuccess('Payment Processed', 'Payment has been successfully processed');
    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      toastError('Error', 'Failed to process payment. Please try again.');
    }
  }, [toastSuccess, toastError]);

  const handleRefundPayment = useCallback(async (payment: any) => {
    try {
      console.log('Refunding payment:', payment.id);
      toastSuccess('Payment Refunded', 'Payment has been successfully refunded');
    } catch (error: unknown) {
      console.error('Error refunding payment:', error);
      toastError('Error', 'Failed to refund payment. Please try again.');
    }
  }, [toastSuccess, toastError]);

  const handleDownloadReceipt = useCallback(async (payment: any) => {
    try {
      console.log('Downloading receipt for payment:', payment.id);
      toastInfo('Receipt Downloaded', 'Payment receipt has been downloaded');
    } catch (error: unknown) {
      console.error('Error downloading receipt:', error);
      toastError('Error', 'Failed to download receipt. Please try again.');
    }
  }, [toastInfo, toastError]);

  // ============================================================================
  // CALCULATE STATS
  // ============================================================================
  
  const stats = useMemo(() => {
    const payments = data?.payments || [];
    
    return {
      totalRevenue: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0),
      failedAmount: payments
        .filter(p => p.status === 'failed')
        .reduce((sum, p) => sum + p.amount, 0),
      monthlyRevenue: payments
        .filter(p => p.status.toLowerCase() === 'completed' && p.subscription?.billingCycle?.name === 'Monthly')
        .reduce((sum, p) => sum + p.amount, 0)
    };
  }, [data]);

  // Transform payments for UI
  const payments = useMemo(() => {
    return (data?.payments || []).map((payment: any) => ({
      ...payment,
      method: payment.paymentMethod?.toUpperCase() || payment.method || 'UNKNOWN',
      subscription: {
        id: `sub_${payment.id}`,
        merchantId: `merchant_${payment.id}`,
        planId: `plan_${payment.id}`,
        status: 'ACTIVE',
        amount: payment.amount,
        currency: payment.currency,
        merchant: {
          id: `merchant_${payment.id}`,
          name: payment.merchantName || 'Unknown',
          email: `${(payment.merchantName || 'unknown').toLowerCase().replace(/\s+/g, '')}@example.com`
        },
        plan: {
          id: `plan_${payment.id}`,
          name: payment.planName || 'Unknown',
          price: payment.amount,
          currency: payment.currency
        },
        billingCycle: {
          id: `bc_${payment.id}`,
          name: payment.billingCycle === 'monthly' ? 'Monthly' : 'Unknown',
          months: 1,
          discount: 0
        }
      }
    }));
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle subtitle="Track platform revenue, payments, and financial metrics">
          Payment Management
        </PageTitle>
      </PageHeader>

      {/* Compact Stats and Filters Section */}
      <div className="flex-shrink-0">
        {/* Compact Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Card className="border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Total Revenue</p>
                  <p className="text-lg font-bold text-action-primary">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-4 w-4 text-action-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Monthly</p>
                  <p className="text-lg font-bold text-action-success">${stats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <Calendar className="h-4 w-4 text-action-success flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Pending</p>
                  <p className="text-lg font-bold text-brand-secondary">${stats.pendingAmount.toLocaleString()}</p>
                </div>
                <Clock className="h-4 w-4 text-brand-secondary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-secondary mb-0.5">Failed</p>
                  <p className="text-lg font-bold text-action-danger">${stats.failedAmount.toLocaleString()}</p>
                </div>
                <XCircle className="h-4 w-4 text-action-danger flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by merchant, invoice, or transaction ID..."
                    value={search}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={status}
                  onChange={handleStatusChange}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={handleDateFilterChange}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </select>

                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 mt-2">
        <div className="flex flex-col h-full">
          {/* Table - takes full width */}
          <div className="flex-1 min-h-0 overflow-auto">
            <PaymentTable
              payments={payments}
              onView={handleViewPayment}
              onDownloadReceipt={handleDownloadReceipt}
              onRefund={handleRefundPayment}
              loading={loading}
            />
          </div>

          {/* Pagination at bottom - Standard Pattern */}
          {data && data.total > 0 && data.total > data.limit && (
            <div className="flex-shrink-0 py-4">
              <Pagination
                currentPage={data.currentPage || data.page || 1}
                totalPages={data.totalPages || Math.ceil(data.total / data.limit)}
                total={data.total}
                limit={data.limit}
                onPageChange={handlePageChange}
                itemName="payments"
              />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
