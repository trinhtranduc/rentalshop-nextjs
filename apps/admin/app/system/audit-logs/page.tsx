'use client';

import React, { useState, useEffect } from 'react';
import { 
  AuditLogViewer,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Pagination,
  useToasts
} from '@rentalshop/ui';
import { 
  getAuditLogs, 
  getAuditLogStats,
  type AuditLog, 
  type AuditLogFilter, 
  type AuditLogStats 
} from '@rentalshop/utils';
import { usePagination } from '@rentalshop/hooks';

export default function SystemAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AuditLogFilter>({
    limit: 10,
    offset: 0
  });
  
  // Use reusable pagination hook
  const {
    pagination,
    handlePageChange,
    updatePaginationFromResponse
  } = usePagination({ initialLimit: 10, initialOffset: 0 });
  
  const { addToast } = useToasts();

  // Load audit logs
  const loadAuditLogs = async (newFilter?: AuditLogFilter) => {
    setLoading(true);
    try {
      const currentFilter = newFilter || filter;
      const result = await getAuditLogs(currentFilter);
      
      setLogs(result.data);
      updatePaginationFromResponse(result.pagination);
    } catch (error: any) {
      addToast({
        title: 'Failed to load audit logs',
        message: error.message || 'Please try again later.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const result = await getAuditLogStats();
      setStats(result.data);
    } catch (error: any) {
      console.error('Failed to load audit statistics:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilter: AuditLogFilter) => {
    setFilter(newFilter);
    loadAuditLogs(newFilter);
  };

  // Handle filter reset
  const handleFilterReset = () => {
    const resetFilter = { limit: 10, offset: 0 };
    setFilter(resetFilter);
    loadAuditLogs(resetFilter);
  };

  // Handle pagination - use the hook's handlePageChange
  const handlePageChangeClick = (page: number) => {
    handlePageChange(page);
    const newFilter = {
      ...filter,
      offset: (page - 1) * pagination.limit
    };
    setFilter(newFilter);
    loadAuditLogs(newFilter);
  };

  // Handle view details - this is called when a log is viewed
  const handleViewDetails = (log: AuditLog) => {
    console.log('Audit log viewed:', {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user?.email,
      timestamp: log.createdAt
    });
    // The AuditLogViewer component handles the modal display internally
    // This callback is for additional logging, analytics, or side effects
  };

  // Load data on mount
  useEffect(() => {
    loadAuditLogs();
    loadStats();
  }, []);

  return (
    <PageWrapper maxWidth="7xl" padding="md" spacing="md">
      <PageHeader>
        <PageTitle subtitle="Track all system changes, user actions, and security events across the platform">
          System Audit Logs
        </PageTitle>
      </PageHeader>
      
      <PageContent>
        <AuditLogViewer 
          className="w-full"
          logs={logs}
          stats={stats}
          loading={loading}
          filter={filter}
          pagination={pagination}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          onRefresh={() => loadAuditLogs()}
          onViewDetails={handleViewDetails}
        />
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={handlePageChangeClick}
              itemName="audit logs"
            />
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
}