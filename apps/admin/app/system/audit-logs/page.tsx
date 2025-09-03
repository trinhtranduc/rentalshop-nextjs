'use client';

import React, { useState, useEffect } from 'react';
import { AuditLogViewer } from '@rentalshop/ui';
import { 
  getAuditLogs, 
  getAuditLogStats,
  type AuditLog, 
  type AuditLogFilter, 
  type AuditLogStats 
} from '@rentalshop/utils';
import { useToasts } from '@rentalshop/ui';

export default function SystemAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AuditLogFilter>({
    limit: 50,
    offset: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });
  const { addToast } = useToasts();

  // Load audit logs
  const loadAuditLogs = async (newFilter?: AuditLogFilter) => {
    setLoading(true);
    try {
      const currentFilter = newFilter || filter;
      const result = await getAuditLogs(currentFilter);
      
      setLogs(result.data);
      setPagination(result.pagination);
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
    const resetFilter = { limit: 50, offset: 0 };
    setFilter(resetFilter);
    loadAuditLogs(resetFilter);
  };

  // Handle pagination
  const handleLoadMore = () => {
    const newFilter = {
      ...filter,
      offset: (filter.offset || 0) + (filter.limit || 50)
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
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">System Audit Logs</h1>
        <p className="text-text-secondary">
          Track all system changes, user actions, and security events across the platform.
        </p>
      </div>
      
      <AuditLogViewer 
        className="w-full"
        logs={logs}
        stats={stats}
        loading={loading}
        filter={filter}
        pagination={pagination}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        onLoadMore={handleLoadMore}
        onRefresh={() => loadAuditLogs()}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}