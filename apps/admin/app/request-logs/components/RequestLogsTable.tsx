'use client';

import React from 'react';
import { Table, Button, Badge, Skeleton } from '@rentalshop/ui';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RequestLog } from '@rentalshop/utils';

interface RequestLogsTableProps {
  logs: RequestLog[];
  loading: boolean;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  onLogClick: (log: RequestLog) => void;
  onPageChange: (page: number) => void;
}

/**
 * Request Logs Table Component
 */
export function RequestLogsTable({
  logs,
  loading,
  pagination,
  onLogClick,
  onPageChange,
}: RequestLogsTableProps) {
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  // Get status code color
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'warning';
    if (statusCode >= 400) return 'destructive';
    return 'default';
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No request logs found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <th>Correlation ID</th>
              <th>Method</th>
              <th>Path</th>
              <th>Status</th>
              <th>Duration</th>
              <th>User</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/50">
                <td className="font-mono text-xs">{log.correlationId}</td>
                <td>
                  <Badge variant="outline">{log.method}</Badge>
                </td>
                <td className="max-w-md truncate" title={log.path}>
                  {log.path}
                </td>
                <td>
                  <Badge variant={getStatusColor(log.statusCode)}>
                    {log.statusCode}
                  </Badge>
                </td>
                <td className="text-sm">{formatDuration(log.duration)}</td>
                <td>
                  {log.user ? (
                    <div className="text-sm">
                      <div className="font-medium">{log.user.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {log.user.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </td>
                <td className="text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLogClick(log)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-muted-foreground">
          Showing {pagination.offset + 1} to{' '}
          {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
          {pagination.total} logs
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!pagination.hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
