/**
 * Request Logs API Client
 * 
 * Client functions to query request logs from admin UI
 */

import { authenticatedFetch } from '../core/common';

export interface RequestLog {
  id: number;
  correlationId: string;
  method: string;
  path: string;
  queryParams: Record<string, any> | null;
  requestBody: any | null;
  responseBody: any | null;
  statusCode: number;
  duration: number;
  userId: number | null;
  merchantId: number | null;
  outletId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  } | null;
  merchant: {
    id: number;
    name: string;
  } | null;
}

export interface RequestLogsResponse {
  logs: RequestLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface RequestLogsFilters {
  correlationId?: string;
  path?: string;
  method?: string;
  userId?: number;
  merchantId?: number;
  outletId?: number;
  statusCode?: number;
  startDate?: string; // ISO format
  endDate?: string; // ISO format
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'duration' | 'statusCode';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch request logs with filters
 */
export async function fetchRequestLogs(
  filters: RequestLogsFilters = {}
): Promise<RequestLogsResponse> {
  const params = new URLSearchParams();

  if (filters.correlationId) params.append('correlationId', filters.correlationId);
  if (filters.path) params.append('path', filters.path);
  if (filters.method) params.append('method', filters.method);
  if (filters.userId) params.append('userId', filters.userId.toString());
  if (filters.merchantId) params.append('merchantId', filters.merchantId.toString());
  if (filters.outletId) params.append('outletId', filters.outletId.toString());
  if (filters.statusCode) params.append('statusCode', filters.statusCode.toString());
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await authenticatedFetch(`/api/request-logs?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch request logs: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch request logs');
  }

  return data.data;
}

/**
 * Fetch a specific request log by correlation ID
 */
export async function fetchRequestLogByCorrelationId(
  correlationId: string
): Promise<RequestLog | null> {
  const response = await fetchRequestLogs({ correlationId, limit: 1 });
  
  if (response.logs.length === 0) {
    return null;
  }

  return response.logs[0];
}
