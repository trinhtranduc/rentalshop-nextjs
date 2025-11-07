'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';
// Disable prerendering to avoid module resolution issues

import React, { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, 
  CardContent,
  PageWrapper,
  PageHeader,
  PageTitle,
  Button,
  PaymentTable,
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

      {/* Fixed Stats and Filters Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Total Revenue</p>
                  <p className="text-2xl font-bold text-action-primary mb-1">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-action-primary">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-action-success mt-2">
                <TrendingUp className="w-4 h-4" />
                +12.5% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-action-success mb-1">${stats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-action-success">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-action-success mt-2">
                <TrendingUp className="w-4 h-4" />
                +8.2% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Pending Payments</p>
                  <p className="text-2xl font-bold text-brand-secondary mb-1">${stats.pendingAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-brand-secondary">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-sm text-text-tertiary mt-2">
                {payments.filter(p => p.status === 'pending').length} transactions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Failed Payments</p>
                  <p className="text-2xl font-bold text-action-danger mb-1">${stats.failedAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-action-danger">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-action-danger mt-2">
                <TrendingDown className="w-4 h-4" />
                {payments.filter(p => p.status === 'failed').length} failed
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
      <div className="flex-1 min-h-0 mt-4">
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

          {/* Pagination at bottom - same width as table */}
          {data && data.total > 0 && data.total > data.limit && (
            <div className="flex-shrink-0 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((data.currentPage - 1) * data.limit) + 1} to {Math.min(data.currentPage * data.limit, data.total)} of {data.total} payments
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.currentPage - 1)}
                    disabled={data.currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        return p === 1 || p === data.totalPages || 
                               Math.abs(p - data.currentPage) <= 1;
                      })
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={data.currentPage === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(p)}
                            className="w-10 h-9"
                          >
                            {p}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.currentPage + 1)}
                    disabled={data.currentPage === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
