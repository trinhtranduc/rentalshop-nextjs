/**
 * Audit Logs API Client
 * 
 * This module provides API client functions for audit logs operations.
 * All API requests should be made through these functions, not directly in UI components.
 */

import { authenticatedFetch, parseApiResponse } from '../common';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../common';

// Types
export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  merchant?: {
    id: number;
    name: string;
  };
  outlet?: {
    id: number;
    name: string;
  };
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  description?: string;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  merchantId?: string;
  outletId?: string;
  severity?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuditLogStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntity: Record<string, number>;
  logsBySeverity: Record<string, number>;
  logsByCategory: Record<string, number>;
  recentActivity: number;
}

export interface AuditLogStatsResponse {
  success: boolean;
  data: AuditLogStats;
}


/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<ApiResponse<AuditLog[]>> {
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const url = queryString ? `${apiUrls.auditLogs.list}?${queryString}` : apiUrls.auditLogs.list;
  
  const response = await authenticatedFetch(url);
  return await parseApiResponse<AuditLog[]>(response);
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(filter: Partial<AuditLogFilter> = {}): Promise<ApiResponse<AuditLogStats>> {
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const url = queryString ? `${apiUrls.auditLogs.stats}?${queryString}` : apiUrls.auditLogs.stats;
  
  const response = await authenticatedFetch(url);
  return await parseApiResponse<AuditLogStats>(response);
}

/**
 * Export audit logs (if endpoint exists)
 */
export async function exportAuditLogs(filter: AuditLogFilter = {}): Promise<Blob> {
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const url = queryString ? `${apiUrls.auditLogs.export}?${queryString}` : apiUrls.auditLogs.export;
  
  const response = await authenticatedFetch(url, {
    headers: {
      'Accept': 'application/octet-stream',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export failed: ${errorText}`);
  }

  return response.blob();
}
