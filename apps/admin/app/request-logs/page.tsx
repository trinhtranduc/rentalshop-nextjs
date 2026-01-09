'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  useToast,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentalshop/ui';
import { RefreshCw, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchRequestLogs, type RequestLogsFilters, type RequestLog } from '@rentalshop/utils';
import { RequestLogsTable } from './components/RequestLogsTable';
import { RequestLogsFilters as Filters } from './components/RequestLogsFilters';
import { RequestLogDetail } from './components/RequestLogDetail';

/**
 * Admin Request Logs Page
 * 
 * View and search all API request logs with correlation IDs for traceability
 */
export default function RequestLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toastError } = useToast();

  // State
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  // Filters from URL params
  const method = searchParams.get('method') || '';
  const path = searchParams.get('path') || '';
  const statusCode = searchParams.get('statusCode') || '';
  const userId = searchParams.get('userId') || '';
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Build filters
  const filters: RequestLogsFilters = useMemo(() => ({
    method: method || undefined,
    path: path || undefined,
    statusCode: statusCode ? parseInt(statusCode) : undefined,
    userId: userId ? parseInt(userId) : undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit,
    offset: (page - 1) * limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [method, path, statusCode, userId, search, startDate, endDate, page, limit]);

  // Fetch logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchRequestLogs(filters);
      setLogs(response.logs);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch request logs:', error);
      toastError('Failed to load request logs');
    } finally {
      setLoading(false);
    }
  }, [filters, toastError]);

  // Load logs on mount and when filters change
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Update URL params when filters change
  const updateFilters = useCallback((newFilters: Partial<RequestLogsFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newFilters.method) params.set('method', newFilters.method);
    else params.delete('method');
    
    if (newFilters.path) params.set('path', newFilters.path);
    else params.delete('path');
    
    if (newFilters.statusCode) params.set('statusCode', newFilters.statusCode.toString());
    else params.delete('statusCode');
    
    if (newFilters.userId) params.set('userId', newFilters.userId.toString());
    else params.delete('userId');
    
    if (newFilters.search) params.set('search', newFilters.search);
    else params.delete('search');
    
    if (newFilters.startDate) params.set('startDate', newFilters.startDate);
    else params.delete('startDate');
    
    if (newFilters.endDate) params.set('endDate', newFilters.endDate);
    else params.delete('endDate');
    
    params.set('page', '1'); // Reset to first page when filters change
    params.set('limit', (newFilters.limit || 50).toString());
    
    router.push(`/request-logs?${params.toString()}`);
  }, [router, searchParams]);

  // Handle log selection
  const handleLogClick = useCallback((log: RequestLog) => {
    setSelectedLog(log);
    setShowDetail(true);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/request-logs?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Request Logs</PageTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Filters
            filters={filters}
            onFiltersChange={updateFilters}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-0">
          <RequestLogsTable
            logs={logs}
            loading={loading}
            pagination={pagination}
            onLogClick={handleLogClick}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {showDetail && selectedLog && (
        <RequestLogDetail
          log={selectedLog}
          open={showDetail}
          onClose={() => {
            setShowDetail(false);
            setSelectedLog(null);
          }}
        />
      )}
    </PageWrapper>
  );
}
